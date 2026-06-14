import { Injectable } from '@nestjs/common';
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';
import { getDaysUntilDue, formatFullDate } from '../../../shared/utils/date.util';

@Injectable()
export class UpcomingCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('upcoming')
    .setDescription('Xem lịch nhắc nhở upcoming cho các subscriptions');

  constructor(private readonly subscriptionService: SubscriptionService) {}

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const subscriptions = await this.subscriptionService.findAll(['ACTIVE']);

    if (subscriptions.length === 0) {
      await interaction.editReply('📭 Không có subscription nào đang hoạt động.');
      return;
    }

    const sections: string[] = [];

    for (const sub of subscriptions) {
      const daysUntilDue = getDaysUntilDue(sub.nextDueDate);
      const dueDateStr = formatFullDate(sub.nextDueDate);
      const lines: string[] = [`**${sub.name}**`];

      if (daysUntilDue < 0) {
        lines.push(`⚠️ Quá hạn **${Math.abs(daysUntilDue)} ngày** (đến hạn ${dueDateStr})`);
        lines.push(`Use: \`/mark-done ${sub.name}\``);
      } else if (daysUntilDue === 0) {
        lines.push(`✅ Đến hạn hôm nay (${dueDateStr})`);
        lines.push(`Use: \`/mark-done ${sub.name}\``);
      } else {
        lines.push(`✅ Đến hạn ${dueDateStr} · Còn ${daysUntilDue} ngày`);
      }

      sections.push(lines.join('\n'));
    }

    const separator = '\n──────────────────\n';
    const chunkSize = 3800;
    const embeds: EmbedBuilder[] = [];
    let current = '';

    for (const section of sections) {
      if ((current + separator + section).length > chunkSize && current.length > 0) {
        embeds.push(
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(embeds.length === 0 ? '📅 Subscription Schedule' : '​')
            .setDescription(current),
        );
        current = section;
      } else {
        current = current ? current + separator + section : section;
      }
    }

    if (current) {
      embeds.push(
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(embeds.length === 0 ? '📅 Subscription Schedule' : '​')
          .setDescription(current),
      );
    }

    await interaction.editReply({ embeds });
  }
}
