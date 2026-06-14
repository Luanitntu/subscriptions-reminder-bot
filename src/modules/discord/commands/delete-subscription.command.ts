import { Injectable } from '@nestjs/common';
import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';

@Injectable()
export class DeleteSubscriptionCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('delete-subscription')
    .setDescription('Xóa hoàn toàn subscription khỏi hệ thống')
    .addStringOption((o) =>
      o.setName('name').setDescription('Tên subscription').setRequired(true).setAutocomplete(true),
    );

  constructor(private readonly subscriptionService: SubscriptionService) {}

  async execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('name', true);
    const sub = await this.subscriptionService.findByName(name);
    if (!sub) {
      await interaction.reply({ content: `❌ Không tìm thấy subscription **${name}**.`, ephemeral: true });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('confirm-delete').setLabel('Confirm').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel-delete').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    const embed = new EmbedBuilder()
      .setColor(0xff9900)
      .setTitle('⚠️ Bạn có chắc chắn?')
      .setDescription(
        `Xóa **${sub.name}** sẽ xóa **toàn bộ lịch sử thanh toán** liên quan.\nHành động này **không thể hoàn tác**.`,
      );

    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });

    try {
      const click = await response.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id,
        time: 30_000,
      });

      if (click.customId === 'confirm-delete') {
        await this.subscriptionService.delete(sub.id);
        await click.update({
          content: `🗑️ Đã xóa **${sub.name}** khỏi hệ thống.`,
          embeds: [],
          components: [],
        });
      } else {
        await click.update({
          content: `✅ Đã hủy. **${sub.name}** vẫn được giữ nguyên.`,
          embeds: [],
          components: [],
        });
      }
    } catch {
      await interaction.editReply({
        content: '⏱️ Hết thời gian xác nhận — đã hủy thao tác xóa.',
        embeds: [],
        components: [],
      });
    }
  }

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused();
    const results = await this.subscriptionService.searchNames(focused);
    await interaction.respond(results.map((s) => ({ name: s.name, value: s.name })));
  }
}
