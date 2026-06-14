import { Injectable } from '@nestjs/common';
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';
import { formatCurrency } from '../../../shared/utils/format.util';

@Injectable()
export class MonthlySummaryCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('monthly-summary')
    .setDescription('Xem tổng chi phí subscriptions theo danh mục');

  constructor(private readonly subscriptionService: SubscriptionService) {}

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const subscriptions = await this.subscriptionService.findAll(['ACTIVE']);

    if (subscriptions.length === 0) {
      await interaction.editReply('📭 Không có subscription nào đang hoạt động.');
      return;
    }

    const grouped = new Map<string, { name: string; cost: number; currency: string }[]>();

    for (const sub of subscriptions) {
      const cat = sub.category || 'Khác';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat).push({ name: sub.name, cost: sub.cost, currency: sub.currency });
    }

    const sortedCategories = [...grouped.keys()].sort();

    const lines: string[] = [];
    const totalByCurrency = new Map<string, number>();

    for (const cat of sortedCategories) {
      const items = grouped.get(cat);
      lines.push(`**${cat}**`);

      for (const item of items.sort((a, b) => b.cost - a.cost)) {
        const nameCol = item.name.padEnd(20, ' ');
        lines.push(`\`${nameCol}\` ${formatCurrency(item.cost, item.currency)}`);
        totalByCurrency.set(item.currency, (totalByCurrency.get(item.currency) || 0) + item.cost);
      }

      lines.push('');
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━');
    const totals = [...totalByCurrency.entries()]
      .map(([cur, amount]) => formatCurrency(amount, cur))
      .join(' + ');
    lines.push(`**Total: ${totals}**`);

    const embed = new EmbedBuilder()
      .setColor(0xf0a500)
      .setTitle('💰 Monthly Summary')
      .setDescription(lines.join('\n'))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
