import { Module } from '@nestjs/common';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ExportModule } from '../export/export.module';
import { NotificationModule } from '../notification/notification.module';
import { DiscordService } from './discord.service';
import { SLASH_COMMANDS } from './constants/commands.token';
import { SlashCommand } from './interfaces/command.interface';
import { AddSubscriptionCommand } from './commands/add-subscription.command';
import { EditSubscriptionCommand } from './commands/edit-subscription.command';
import { DeleteSubscriptionCommand } from './commands/delete-subscription.command';
import { ListSubscriptionsCommand } from './commands/list-subscriptions.command';
import { MarkDoneCommand } from './commands/mark-done.command';
import { SkipCommand } from './commands/skip.command';
import { PauseCommand } from './commands/pause.command';
import { ResumeCommand } from './commands/resume.command';
import { CancelCommand } from './commands/cancel.command';
import { UpcomingCommand } from './commands/upcoming.command';
import { MonthlySummaryCommand } from './commands/monthly-summary.command';
import { ExportCsvCommand } from './commands/export-csv.command';
import { HelpCommand } from './commands/help.command';
import { SubscriptionDetailCommand } from './commands/subscription-detail.command';
import { StatsCommand } from './commands/stats.command';
import { TestReminderCommand } from './commands/test-reminder.command';

const COMMAND_PROVIDERS = [
  AddSubscriptionCommand,
  EditSubscriptionCommand,
  DeleteSubscriptionCommand,
  ListSubscriptionsCommand,
  SubscriptionDetailCommand,
  MarkDoneCommand,
  SkipCommand,
  PauseCommand,
  ResumeCommand,
  CancelCommand,
  UpcomingCommand,
  MonthlySummaryCommand,
  StatsCommand,
  ExportCsvCommand,
  HelpCommand,
  TestReminderCommand,
];

@Module({
  imports: [SubscriptionModule, ExportModule, NotificationModule],
  providers: [
    ...COMMAND_PROVIDERS,
    {
      provide: SLASH_COMMANDS,
      useFactory: (...commands: SlashCommand[]) => commands,
      inject: COMMAND_PROVIDERS,
    },
    DiscordService,
  ],
  exports: [DiscordService],
})
export class DiscordModule {}
