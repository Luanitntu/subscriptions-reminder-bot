import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LogModule } from './shared/log/log.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ExportModule } from './modules/export/export.module';
import { DiscordModule } from './modules/discord/discord.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LogModule,
    PrismaModule,
    SubscriptionModule,
    NotificationModule,
    ExportModule,
    DiscordModule,
    SchedulerModule,
  ],
})
export class AppModule {}
