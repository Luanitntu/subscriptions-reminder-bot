import { Injectable } from '@nestjs/common';
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';

@Injectable()
export class CancelCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('cancel')
    .setDescription('Đánh dấu subscription đã hủy (lưu lịch sử, không nhắc nhở nữa)')
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

    if (sub.status === 'CANCELLED') {
      await interaction.editReply(`⚠️ **${name}** đã bị hủy trước đó rồi.`);
      return;
    }

    await this.subscriptionService.cancel(sub.id);
    await interaction.editReply(`❌ Đã hủy **${name}**. Lịch sử thanh toán vẫn được lưu.`);
  }

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused();
    const results = await this.subscriptionService.searchNames(focused, ['ACTIVE', 'PAUSED']);
    await interaction.respond(results.map((s) => ({ name: s.name, value: s.name })));
  }
}
