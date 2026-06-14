import { Injectable } from '@nestjs/common';
import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';
import { NotificationService } from '../../notification/notification.service';
import { getDaysUntilDue } from '../../../shared/utils/date.util';

@Injectable()
export class TestReminderCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('test-reminder')
    .setDescription('[TEST] Gửi thử reminder cho tất cả sub ACTIVE ngay lập tức');

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const channelId = process.env.DISCORD_CHANNEL_ID;
    if (!channelId) {
      await interaction.editReply('❌ Chưa cấu hình DISCORD_CHANNEL_ID.');
      return;
    }

    const subscriptions = await this.subscriptionService.findAll(['ACTIVE']);
    if (subscriptions.length === 0) {
      await interaction.editReply('📭 Không có subscription ACTIVE nào.');
      return;
    }

    const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      await interaction.editReply(`❌ Không tìm thấy channel ${channelId} hoặc không phải text channel.`);
      return;
    }

    // Same filter as the real 8:30 job: only within 3/2/1/0 days or overdue.
    const due = subscriptions.filter(
      (s) => this.notificationService.getNotificationType(getDaysUntilDue(s.nextDueDate)) !== null,
    );

    if (due.length === 0) {
      const nearest = subscriptions
        .map((s) => ({ name: s.name, days: getDaysUntilDue(s.nextDueDate) }))
        .sort((a, b) => a.days - b.days)[0];
      await interaction.editReply(
        '📭 Không có sub nào trong mốc nhắc nhở (3 ngày tới hoặc quá hạn) → reminder 8h30 hôm nay sẽ **không gửi gì**.\n' +
          `Gần nhất: **${nearest.name}** còn ${nearest.days} ngày.`,
      );
      return;
    }

    for (const sub of due) {
      const embed = this.notificationService.buildReminderEmbed(sub);
      await (channel as TextChannel).send({ embeds: [embed] });
    }

    await interaction.editReply(
      `✅ Đã gửi ${due.length} reminder vào <#${channelId}> (đúng logic 8h30, chỉ bỏ qua chống-trùng để test lại được).`,
    );
  }
}
