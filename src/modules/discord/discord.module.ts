import { Module } from '@nestjs/common';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ExportModule } from '../export/export.module';
import { DiscordService } from './discord.service';
import { SLASH_COMMANDS } from './constants/commands.token';
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

const COMMAND_PROVIDERS = [
  AddSubscriptionCommand,
  EditSubscriptionCommand,
  DeleteSubscriptionCommand,
  ListSubscriptionsCommand,
  MarkDoneCommand,
  SkipCommand,
  PauseCommand,
  ResumeCommand,
  CancelCommand,
  UpcomingCommand,
  MonthlySummaryCommand,
  ExportCsvCommand,
];

@Module({
  imports: [SubscriptionModule, ExportModule],
  providers: [
    ...COMMAND_PROVIDERS,
    {
      provide: SLASH_COMMANDS,
      useFactory: (
        add: AddSubscriptionCommand,
        edit: EditSubscriptionCommand,
        del: DeleteSubscriptionCommand,
        list: ListSubscriptionsCommand,
        markDone: MarkDoneCommand,
        skip: SkipCommand,
        pause: PauseCommand,
        resume: ResumeCommand,
        cancel: CancelCommand,
        upcoming: UpcomingCommand,
        summary: MonthlySummaryCommand,
        exportCsv: ExportCsvCommand,
      ) => [add, edit, del, list, markDone, skip, pause, resume, cancel, upcoming, summary, exportCsv],
      inject: COMMAND_PROVIDERS,
    },
    DiscordService,
  ],
  exports: [DiscordService],
})
export class DiscordModule {}
