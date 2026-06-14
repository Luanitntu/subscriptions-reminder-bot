import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { SubscriptionService } from '../subscription/subscription.service';
import { NotificationService } from '../notification/notification.service';
import { DiscordService } from '../discord/discord.service';
import { getDaysUntilDue } from '../../shared/utils/date.util';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private interval: NodeJS.Timeout;

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly notificationService: NotificationService,
    private readonly discordService: DiscordService,
  ) {}

  onModuleInit() {
    const hour = parseInt(process.env.REMINDER_HOUR || '8', 10);
    const minute = parseInt(process.env.REMINDER_MINUTE || '30', 10);
    const tz = process.env.TIMEZONE || 'Asia/Ho_Chi_Minh';

    this.logger.log(`Daily reminder scheduled at ${hour}:${String(minute).padStart(2, '0')} (${tz})`);

    this.interval = setInterval(async () => {
      const now = dayjs().tz(tz);
      if (now.hour() === hour && now.minute() === minute) {
        await this.handleDailyReminder();
      }
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  async handleDailyReminder() {
    this.logger.log('Running daily reminder check...');

    const channelId = process.env.DISCORD_CHANNEL_ID;
    if (!channelId) {
      this.logger.error('DISCORD_CHANNEL_ID is not set');
      return;
    }

    const subscriptions = await this.subscriptionService.findAll(['ACTIVE']);
    let sent = 0;

    for (const sub of subscriptions) {
      const daysUntilDue = getDaysUntilDue(sub.nextDueDate);
      const notifType = this.notificationService.getNotificationType(daysUntilDue);

      if (!notifType) continue;

      const alreadySent = await this.notificationService.hasBeenSentToday(sub.id, notifType);
      if (alreadySent) continue;

      try {
        const embed = this.notificationService.buildReminderEmbed(sub);
        await this.discordService.sendEmbed(channelId, embed);
        await this.notificationService.logNotification(sub.id, notifType);
        sent++;
      } catch (err) {
        this.logger.error(`Failed to send reminder for ${sub.name}: ${err.message}`);
      }
    }

    this.logger.log(`Daily reminder done. Sent ${sent} notification(s).`);
  }
}
