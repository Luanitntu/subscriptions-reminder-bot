import { Injectable } from '@nestjs/common';
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { SubscriptionStatus } from '@prisma/client';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';
import { formatCurrency, formatBillingCycle } from '../../../shared/utils/format.util';
import { formatFullDate, getDaysUntilDue } from '../../../shared/utils/date.util';

@Injectable()
export class ListSubscriptionsCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('list-subscriptions')
    .setDescription('Xem danh sách subscriptions')
    .addStringOption((o) =>
      o
        .setName('status')
        .setDescription('Lọc theo trạng thái')
        .setRequired(false)
        .addChoices(
          { name: 'Tất cả', value: 'ALL' },
          { name: 'Đang hoạt động', value: 'ACTIVE' },
          { name: 'Tạm dừng', value: 'PAUSED' },
          { name: 'Đã hủy', value: 'CANCELLED' },
        ),
    );

  constructor(private readonly subscriptionService: SubscriptionService) {}

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const statusFilter = interaction.options.getString('status') || 'ACTIVE';
    const statuses =
      statusFilter === 'ALL'
        ? undefined
        : ([statusFilter] as SubscriptionStatus[]);

    const subscriptions = await this.subscriptionService.findAll(statuses);

    if (subscriptions.length === 0) {
      await interaction.editReply('📭 Không có subscription nào.');
      return;
    }

    const statusEmoji: Record<string, string> = {
      ACTIVE: '🟢',
      PAUSED: '⏸️',
      CANCELLED: '❌',
    };

    const lines = subscriptions.map((s) => {
      const emoji = statusEmoji[s.status] || '❓';
      const days = getDaysUntilDue(s.nextDueDate);
      let dueInfo = formatFullDate(s.nextDueDate);
      if (s.status === 'ACTIVE') {
        if (days < 0) dueInfo += ` (quá hạn ${Math.abs(days)} ngày)`;
        else if (days === 0) dueInfo += ' (hôm nay)';
        else dueInfo += ` (còn ${days} ngày)`;
      }
      return `${emoji} **${s.name}** · ${formatCurrency(s.cost, s.currency)} · ${dueInfo}`;
    });

    const chunkSize = 10;
    const chunks: string[][] = [];
    for (let i = 0; i < lines.length; i += chunkSize) {
      chunks.push(lines.slice(i, i + chunkSize));
    }

    const embeds = chunks.map((chunk, i) =>
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(i === 0 ? `📋 Subscriptions (${subscriptions.length})` : '​')
        .setDescription(chunk.join('\n'))
    );

    await interaction.editReply({ embeds });
  }
}
