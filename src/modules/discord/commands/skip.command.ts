import { Injectable } from '@nestjs/common';
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';
import { formatFullDate } from '../../../shared/utils/date.util';

@Injectable()
export class SkipCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Bỏ qua kỳ thanh toán hiện tại (không ghi nhận chi phí)')
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

    const updated = await this.subscriptionService.skip(sub.id);

    const embed = new EmbedBuilder()
      .setColor(0xffcc00)
      .setTitle('⏭️ Đã bỏ qua kỳ hiện tại')
      .setDescription(`**${updated.name}**`)
      .addFields(
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
