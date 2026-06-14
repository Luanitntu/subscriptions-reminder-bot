import { Injectable } from '@nestjs/common';
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';

@Injectable()
export class HelpCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Xem danh sách tất cả lệnh và cách sử dụng');

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📖 Hướng dẫn sử dụng Subscription Bot')
      .setDescription('Bot quản lý và nhắc nhở thanh toán các subscription cá nhân.')
      .addFields(
        {
          name: '📦 Quản lý Subscription',
          value: [
            '`/add-subscription` — Thêm subscription mới',
            '`/edit-subscription` — Sửa thông tin subscription',
            '`/delete-subscription` — Xóa hoàn toàn khỏi hệ thống',
            '`/list-subscriptions` — Xem danh sách (lọc theo trạng thái)',
          ].join('\n'),
        },
        {
          name: '💳 Thanh toán',
          value: [
            '`/mark-done` — Xác nhận đã thanh toán, tính kỳ tiếp theo',
            '`/skip` — Bỏ qua kỳ hiện tại (không ghi chi phí)',
          ].join('\n'),
        },
        {
          name: '🔄 Trạng thái',
          value: [
            '`/pause` — Tạm dừng nhắc nhở',
            '`/resume` — Kích hoạt lại subscription đã tạm dừng',
            '`/cancel` — Đánh dấu đã hủy (giữ lịch sử)',
          ].join('\n'),
        },
        {
          name: '📊 Báo cáo',
          value: [
            '`/upcoming` — Lịch nhắc nhở sắp tới',
            '`/monthly-summary` — Tổng chi phí theo danh mục',
            '`/export-csv` — Xuất dữ liệu ra file CSV',
          ].join('\n'),
        },
        {
          name: '💡 Ví dụ',
          value: [
            '`/add-subscription name:Netflix cost:180000 next-due-date:2026-07-15 billing-type:Hàng tháng`',
            '`/mark-done name:Netflix`',
            '`/list-subscriptions status:Đang hoạt động`',
          ].join('\n'),
        },
        {
          name: '⏰ Nhắc nhở tự động',
          value: [
            'Bot tự động gửi nhắc nhở mỗi ngày:',
            '🟢 Còn 3 ngày · 🟡 Còn 2 ngày · 🔴 Ngày mai',
            '⚠️ Đến hạn hôm nay · ⚠️ Quá hạn',
          ].join('\n'),
        },
      )
      .setFooter({ text: 'Mẹo: hầu hết lệnh có gợi ý tên subscription khi gõ (autocomplete)' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
