import { Injectable } from '@nestjs/common';
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';
import { formatCurrency } from '../../../shared/utils/format.util';

@Injectable()
export class StatsCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Xem thống kê tổng quan về subscriptions');

  constructor(private readonly subscriptionService: SubscriptionService) {}

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const stats = await this.subscriptionService.getStats();

    const monthlyEntries = [...stats.monthlyByCurrency.entries()];
    const monthlyStr =
      monthlyEntries.map(([cur, amt]) => formatCurrency(Math.round(amt), cur)).join(' + ') || '0';
    const yearlyStr =
      monthlyEntries.map(([cur, amt]) => formatCurrency(Math.round(amt * 12), cur)).join(' + ') || '0';

    const mostExpensiveStr = stats.mostExpensive
      ? `${stats.mostExpensive.name} (${formatCurrency(Math.round(stats.mostExpensive.monthly), stats.mostExpensive.currency)}/tháng)`
      : '—';

    const embed = new EmbedBuilder()
      .setColor(0xf0a500)
      .setTitle('📊 Statistics')
      .addFields(
        { name: 'Active', value: String(stats.active), inline: true },
        { name: 'Paused', value: String(stats.paused), inline: true },
        { name: 'Cancelled', value: String(stats.cancelled), inline: true },
        { name: 'Monthly Cost', value: monthlyStr, inline: false },
        { name: 'Yearly Estimate', value: yearlyStr, inline: false },
        { name: 'Most Expensive', value: mostExpensiveStr, inline: false },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
