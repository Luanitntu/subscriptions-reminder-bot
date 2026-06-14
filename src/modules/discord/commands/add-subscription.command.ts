import { Injectable } from '@nestjs/common';
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';
import { formatCurrency, formatBillingCycle } from '../../../shared/utils/format.util';
import { formatFullDate, parseDateInput } from '../../../shared/utils/date.util';
import { BillingType } from '@prisma/client';

@Injectable()
export class AddSubscriptionCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('add-subscription')
    .setDescription('Thêm subscription mới')
    .addStringOption((o) =>
      o.setName('name').setDescription('Tên subscription').setRequired(true),
    )
    .addNumberOption((o) =>
      o.setName('cost').setDescription('Chi phí').setRequired(true).setMinValue(0),
    )
    .addStringOption((o) =>
      o.setName('next-due-date').setDescription('Ngày đến hạn tiếp theo (YYYY-MM-DD)').setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName('billing-type')
        .setDescription('Loại chu kỳ thanh toán')
        .setRequired(true)
        .addChoices(
          { name: 'Hàng tháng', value: 'MONTH' },
          { name: 'Hàng năm', value: 'YEAR' },
          { name: 'Hàng tuần', value: 'WEEK' },
          { name: 'Hàng ngày', value: 'DAY' },
        ),
    )
    .addStringOption((o) =>
      o
        .setName('currency')
        .setDescription('Đơn vị tiền tệ (mặc định: VND)')
        .setRequired(false)
        .addChoices(
          { name: 'VND', value: 'VND' },
          { name: 'USD', value: 'USD' },
          { name: 'EUR', value: 'EUR' },
        ),
    )
    .addIntegerOption((o) =>
      o.setName('billing-interval').setDescription('Khoảng cách chu kỳ (mặc định: 1)').setRequired(false).setMinValue(1),
    )
    .addStringOption((o) =>
      o.setName('category').setDescription('Danh mục (vd: AI, Entertainment, Utility)').setRequired(false),
    )
    .addStringOption((o) =>
      o.setName('notes').setDescription('Ghi chú').setRequired(false),
    );

  constructor(private readonly subscriptionService: SubscriptionService) {}

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString('name', true);
    const cost = interaction.options.getNumber('cost', true);
    const nextDueDateStr = interaction.options.getString('next-due-date', true);
    const billingType = interaction.options.getString('billing-type', true) as BillingType;
    const currency = interaction.options.getString('currency') || 'VND';
    const billingInterval = interaction.options.getInteger('billing-interval') || 1;
    const category = interaction.options.getString('category') || null;
    const notes = interaction.options.getString('notes') || null;

    const existing = await this.subscriptionService.findByName(name);
    if (existing) {
      await interaction.editReply(`❌ Subscription **${name}** đã tồn tại.`);
      return;
    }

    const nextDueDate = parseDateInput(nextDueDateStr);

    const sub = await this.subscriptionService.create({
      name,
      cost,
      currency,
      billingType,
      billingInterval,
      nextDueDate,
      category,
      notes,
    });

    const embed = new EmbedBuilder()
      .setColor(0x00cc44)
      .setTitle('✅ Subscription đã được thêm')
      .addFields(
        { name: 'Tên', value: sub.name, inline: true },
        { name: 'Chi phí', value: formatCurrency(sub.cost, sub.currency), inline: true },
        { name: 'Chu kỳ', value: formatBillingCycle(sub.billingType, sub.billingInterval), inline: true },
        { name: 'Ngày đến hạn', value: formatFullDate(sub.nextDueDate), inline: true },
        { name: 'Danh mục', value: sub.category || 'Không có', inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
