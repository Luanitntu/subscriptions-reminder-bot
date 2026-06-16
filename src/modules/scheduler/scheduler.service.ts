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
  private startupTimer: NodeJS.Timeout;

  private hour: number;
  private minute: number;
  private tz: string;
  // Ngày (theo TZ) đã chạy xong reminder thành công → tránh chạy lặp trong ngày.
  private lastRunDate: string | null = null;

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly notificationService: NotificationService,
    private readonly discordService: DiscordService,
  ) {}

  onModuleInit() {
    this.hour = parseInt(process.env.REMINDER_HOUR || '8', 10);
    this.minute = parseInt(process.env.REMINDER_MINUTE || '30', 10);
    this.tz = process.env.TIMEZONE || 'Asia/Ho_Chi_Minh';

    this.logger.log(
      `Daily reminder scheduled at ${this.hour}:${String(this.minute).padStart(2, '0')} (${this.tz})`,
    );

    // Kiểm tra mỗi phút (catch-up): nếu đã qua giờ hẹn hôm nay mà chưa chạy → chạy.
    this.interval = setInterval(() => this.tick(), 60_000);
    // Catch-up nhanh sau khi khởi động (vd app vừa restart sau giờ hẹn) — chờ DB sẵn sàng.
    this.startupTimer = setTimeout(() => this.tick(), 15_000);
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
    if (this.startupTimer) clearTimeout(this.startupTimer);
  }

  /** Chạy mỗi phút. Lỗi (vd DB ngủ) chỉ log lại và thử lại lần tick sau — KHÔNG làm crash app. */
  private async tick() {
    try {
      const now = dayjs().tz(this.tz);
      const today = now.format('YYYY-MM-DD');
      const pastDueTime =
        now.hour() > this.hour || (now.hour() === this.hour && now.minute() >= this.minute);

      if (pastDueTime && this.lastRunDate !== today) {
        await this.handleDailyReminder();
        this.lastRunDate = today; // chỉ đánh dấu khi chạy xong (dedup theo sub đã nằm trong DB)
      }
    } catch (err) {
      this.logger.error(`Reminder tick failed (sẽ thử lại ở lần kiểm tra sau): ${err}`);
      // KHÔNG set lastRunDate → lần tick kế tiếp sẽ thử lại khi DB tỉnh.
    }
  }

  async handleDailyReminder() {
    this.logger.log('Running daily reminder check...');

    const channelId = process.env.DISCORD_CHANNEL_ID;
    if (!channelId) {
      this.logger.error('DISCORD_CHANNEL_ID is not set');
      return;
    }

    // Nếu DB ngủ, findAll sẽ throw → tick() bắt và thử lại (không crash, không đánh dấu đã chạy).
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
        this.logger.error(`Failed to send reminder for ${sub.name}: ${err}`);
      }
    }

    this.logger.log(`Daily reminder done. Sent ${sent} notification(s).`);
  }
}
