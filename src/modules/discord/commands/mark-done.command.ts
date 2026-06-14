import { Injectable } from '@nestjs/common';
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';
import { formatCurrency } from '../../../shared/utils/format.util';
import { formatFullDate } from '../../../shared/utils/date.util';

@Injectable()
export class MarkDoneCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('mark-done')
    .setDescription('Xác nhận đã thanh toán subscription')
    .addStringOption((o) =>
      o.setName('name').setDescription('Tên subscription').setRequired(true).setAutocomplete(true),
    )
    .addStringOption((o) =>
      o.setName('note').setDescription('Ghi chú thanh toán').setRequired(false),
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

    const updated = await this.subscriptionService.markDone(sub.id);

    const embed = new EmbedBuilder()
      .setColor(0x00cc44)
      .setTitle('✅ Đã ghi nhận thanh toán')
      .addFields(
        { name: 'Subscription', value: updated.name, inline: true },
        { name: 'Số tiền', value: formatCurrency(sub.cost, sub.currency), inline: true },
        { name: 'Kỳ tiếp theo', value: formatFullDate(updated.nextDueDate), inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused();
    const results = await this.subscriptionService.searchNames(focused, ['ACTIVE']);
    await interaction.respond(results.map((s) => ({ name: s.name, value: s.name })));
  }
}
