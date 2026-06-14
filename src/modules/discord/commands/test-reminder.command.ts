import { Injectable } from '@nestjs/common';
import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';
import { NotificationService } from '../../notification/notification.service';

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
      await interaction.editReply('📭 Không có subscription ACTIVE nào để gửi thử.');
      return;
    }

    const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      await interaction.editReply(`❌ Không tìm thấy channel ${channelId} hoặc không phải text channel.`);
      return;
    }

    for (const sub of subscriptions) {
      const embed = this.notificationService.buildReminderEmbed(sub);
      await (channel as TextChannel).send({ embeds: [embed] });
    }

    await interaction.editReply(
      `✅ Đã gửi thử ${subscriptions.length} reminder vào <#${channelId}>.\n` +
        '_(Test: bỏ qua mốc 3 ngày & không ghi log chống trùng — gửi bao nhiêu lần cũng được)_',
    );
  }
}
