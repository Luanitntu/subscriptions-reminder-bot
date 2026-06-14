import { Injectable } from '@nestjs/common';
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import dayjs from 'dayjs';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';
import { getDaysUntilDue, formatShortDate } from '../../../shared/utils/date.util';

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
      const lines: string[] = [`**${sub.name}**`];

      if (daysUntilDue < 0) {
        const daysOverdue = Math.abs(daysUntilDue);
        lines.push(`⚠️ Quá hạn **${daysOverdue} ngày**`);
        lines.push(`Use: \`/mark-done ${sub.name}\``);
      } else {
        const dueDate = dayjs(sub.nextDueDate);
        if (daysUntilDue >= 3) {
          const d3 = dueDate.subtract(3, 'day');
          const d2 = dueDate.subtract(2, 'day');
          const d1 = dueDate.subtract(1, 'day');
          lines.push(`🟢 Reminder ${formatShortDate(d3.toDate())} · Còn 3 ngày`);
          lines.push(`🟡 Reminder ${formatShortDate(d2.toDate())} · Còn 2 ngày`);
          lines.push(`🔴 Reminder ${formatShortDate(d1.toDate())} · Ngày mai`);
        } else if (daysUntilDue === 2) {
          const d2 = dueDate.subtract(2, 'day');
          const d1 = dueDate.subtract(1, 'day');
          lines.push(`🟡 Reminder ${formatShortDate(d2.toDate())} · Còn 2 ngày`);
          lines.push(`🔴 Reminder ${formatShortDate(d1.toDate())} · Ngày mai`);
        } else if (daysUntilDue === 1) {
          const d1 = dueDate.subtract(1, 'day');
          lines.push(`🔴 Reminder ${formatShortDate(d1.toDate())} · Ngày mai`);
        } else if (daysUntilDue === 0) {
          lines.push(`⚠️ Đến hạn hôm nay!`);
          lines.push(`Use: \`/mark-done ${sub.name}\``);
        }
        lines.push(`✅ Đến hạn ${formatShortDate(sub.nextDueDate)}`);
      }

      sections.push(lines.join('\n'));
    }

    const separator = '\n──────────────────\n';
    const fullText = sections.join(separator);

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
