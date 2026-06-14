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
    .setDescription('Xuất dữ liệu subscriptions và lịch sử thanh toán ra file CSV')
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
    );

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly exportService: ExportService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.options.getString('type') || 'ALL';
    const timestamp = dayjs().format('YYYY-MM-DD');
    const files: AttachmentBuilder[] = [];

    if (type === 'SUBSCRIPTIONS' || type === 'ALL') {
      const subscriptions = await this.subscriptionService.findAll();
      const csv = this.exportService.generateSubscriptionsCsv(subscriptions);
      files.push(
        new AttachmentBuilder(csv, { name: `subscriptions-${timestamp}.csv` }),
      );
    }

    if (type === 'PAYMENTS' || type === 'ALL') {
      const history = await this.subscriptionService.getPaymentHistory();
      const csv = this.exportService.generatePaymentHistoryCsv(history);
      files.push(
        new AttachmentBuilder(csv, { name: `payment-history-${timestamp}.csv` }),
      );
    }

    await interaction.editReply({
      content: `📎 Xuất CSV thành công (${files.length} file)`,
      files,
    });
  }
}
