import { Injectable } from '@nestjs/common';
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';

@Injectable()
export class PauseCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Tạm dừng nhắc nhở subscription')
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

    if (sub.status === 'PAUSED') {
      await interaction.editReply(`⚠️ **${name}** đang ở trạng thái tạm dừng rồi.`);
      return;
    }

    await this.subscriptionService.pause(sub.id);
    await interaction.editReply(`⏸️ Đã tạm dừng nhắc nhở cho **${name}**.`);
  }

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused();
    const results = await this.subscriptionService.searchNames(focused, ['ACTIVE']);
    await interaction.respond(results.map((s) => ({ name: s.name, value: s.name })));
  }
}
