import { Injectable } from '@nestjs/common';
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';
import { formatCurrency, formatBillingCycleEn } from '../../../shared/utils/format.util';
import { formatFullDate } from '../../../shared/utils/date.util';

@Injectable()
export class SubscriptionDetailCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('subscription-detail')
    .setDescription('Xem chi tiết một subscription')
    .addStringOption((o) =>
      o.setName('name').setDescription('Tên subscription').setRequired(true).setAutocomplete(true),
    );

  constructor(private readonly subscriptionService: SubscriptionService) {}

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString('name', true);
    const sub = await this.subscriptionService.findByName(name);
    if (!sub) {
      await interaction.editReply(`❌ Không tìm thấy subscription **${name}**.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📦 ${sub.name}`)
      .addFields(
        { name: 'Category', value: sub.category || '—', inline: true },
        { name: 'Cost', value: formatCurrency(sub.cost, sub.currency), inline: true },
        { name: 'Billing', value: formatBillingCycleEn(sub.billingType, sub.billingInterval), inline: true },
        { name: 'Status', value: sub.status, inline: true },
        { name: 'Next Due', value: formatFullDate(sub.nextDueDate), inline: true },
        { name: 'Last Paid', value: sub.lastPaidDate ? formatFullDate(sub.lastPaidDate) : '—', inline: true },
        { name: 'Auto Renew', value: sub.isAutoRenew ? 'Yes' : 'No', inline: true },
      )
      .setTimestamp();

    if (sub.notes) {
      embed.addFields({ name: 'Notes', value: sub.notes, inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  }

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused();
    const results = await this.subscriptionService.searchNames(focused);
    await interaction.respond(results.map((s) => ({ name: s.name, value: s.name })));
  }
}
