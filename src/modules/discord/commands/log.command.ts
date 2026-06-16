import { Injectable } from '@nestjs/common';
import { ChatInputCommandInteraction, SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';
import { LogService } from '../../../shared/log/log.service';

@Injectable()
export class LogCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('log')
    .setDescription('Xem log của bot (mặc định: hôm nay)')
    .addIntegerOption((o) =>
      o
        .setName('days')
        .setDescription('Số ngày gần nhất muốn lấy')
        .setRequired(false)
        .addChoices(
          { name: 'Hôm nay', value: 1 },
          { name: '2 ngày', value: 2 },
          { name: '3 ngày', value: 3 },
          { name: '4 ngày', value: 4 },
          { name: '5 ngày', value: 5 },
        ),
    );

  constructor(private readonly logService: LogService) {}

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const days = interaction.options.getInteger('days') || 1;
    const files = this.logService.getRecentLogFiles(days);

    if (files.length === 0) {
      await interaction.editReply(
        `📭 Không có log nào trong ${days === 1 ? 'hôm nay' : `${days} ngày gần nhất`}.\n` +
          '_(Lưu ý: log trên Railway bị xoá khi redeploy nếu chưa mount Volume.)_',
      );
      return;
    }

    const attachments = files.map((f) => new AttachmentBuilder(f.path, { name: f.name }));

    await interaction.editReply({
      content: `📄 Log ${days === 1 ? 'hôm nay' : `${days} ngày gần nhất`} (${files.length} file):`,
      files: attachments,
    });
  }
}
