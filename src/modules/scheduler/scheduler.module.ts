import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SubscriptionModule } from '../subscription/subscription.module';
import { NotificationModule } from '../notification/notification.module';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [SubscriptionModule, NotificationModule, DiscordModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
