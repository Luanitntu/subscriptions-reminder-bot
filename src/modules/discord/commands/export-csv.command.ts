import { Injectable } from '@nestjs/common';
import { ChatInputCommandInteraction, SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import dayjs from 'dayjs';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';
import { ExportService } from '../../export/export.service';

@Injectable()
export class ExportCsvCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('export-csv')
    .setDescription('Xuất dữ liệu subscriptions và lịch sử thanh toán ra file')
    .addStringOption((o) =>
      o
        .setName('type')
        .setDescription('Loại dữ liệu')
        .setRequired(false)
        .addChoices(
          { name: 'Tất cả', value: 'ALL' },
          { name: 'Subscriptions', value: 'SUBSCRIPTIONS' },
          { name: 'Lịch sử thanh toán', value: 'PAYMENTS' },
        ),
    )
    .addStringOption((o) =>
      o
        .setName('format')
        .setDescription('Định dạng xuất (mặc định: Bảng đẹp)')
        .setRequired(false)
        .addChoices(
          { name: 'Bảng đẹp (.txt)', value: 'TABLE' },
          { name: 'CSV (cho Excel)', value: 'CSV' },
        ),
    );

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly exportService: ExportService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.options.getString('type') || 'ALL';
    const format = interaction.options.getString('format') || 'TABLE';
    const timestamp = dayjs().format('YYYY-MM-DD');
    const isTable = format === 'TABLE';
    const files: AttachmentBuilder[] = [];

    if (type === 'SUBSCRIPTIONS' || type === 'ALL') {
      const subscriptions = await this.subscriptionService.findAll();
      const buffer = isTable
        ? this.exportService.generateSubscriptionsTable(subscriptions)
        : this.exportService.generateSubscriptionsCsv(subscriptions);
      files.push(
        new AttachmentBuilder(buffer, {
          name: `subscriptions-${timestamp}.${isTable ? 'txt' : 'csv'}`,
        }),
      );
    }

    if (type === 'PAYMENTS' || type === 'ALL') {
      const history = await this.subscriptionService.getPaymentHistory();
      const buffer = isTable
        ? this.exportService.generatePaymentHistoryTable(history)
        : this.exportService.generatePaymentHistoryCsv(history);
      files.push(
        new AttachmentBuilder(buffer, {
          name: `payment-history-${timestamp}.${isTable ? 'txt' : 'csv'}`,
        }),
      );
    }

    await interaction.editReply({
      content: `📎 Xuất ${isTable ? 'bảng' : 'CSV'} thành công (${files.length} file)`,
      files,
    });
  }
}
