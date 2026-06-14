import { Injectable } from '@nestjs/common';
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { BillingType } from '@prisma/client';
import { SlashCommand } from '../interfaces/command.interface';
import { SubscriptionService } from '../../subscription/subscription.service';
import { formatCurrency, formatBillingCycle, buildCategoryChoices } from '../../../shared/utils/format.util';
import { formatFullDate, parseDateInput, buildDateAutocomplete } from '../../../shared/utils/date.util';

@Injectable()
export class EditSubscriptionCommand implements SlashCommand {
  data = new SlashCommandBuilder()
    .setName('edit-subscription')
    .setDescription('Chỉnh sửa subscription')
    .addStringOption((o) =>
      o.setName('name').setDescription('Tên subscription cần sửa').setRequired(true).setAutocomplete(true),
    )
    .addStringOption((o) =>
      o.setName('new-name').setDescription('Tên mới').setRequired(false),
    )
    .addNumberOption((o) =>
      o.setName('cost').setDescription('Chi phí mới').setRequired(false).setMinValue(0),
    )
    .addStringOption((o) =>
      o
        .setName('next-due-date')
        .setDescription('Ngày đến hạn mới (DD/MM/YYYY) — gõ để chọn nhanh')
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addStringOption((o) =>
      o
        .setName('billing-type')
        .setDescription('Loại chu kỳ mới')
        .setRequired(false)
        .addChoices(
          { name: 'Hàng tháng', value: 'MONTH:1' },
          { name: '2 tháng', value: 'MONTH:2' },
          { name: '3 tháng', value: 'MONTH:3' },
          { name: '6 tháng', value: 'MONTH:6' },
          { name: 'Hàng năm', value: 'YEAR:1' },
          { name: 'Hàng tuần', value: 'WEEK:1' },
          { name: 'Hàng ngày', value: 'DAY:1' },
        ),
    )
    .addStringOption((o) =>
      o
        .setName('currency')
        .setDescription('Đơn vị tiền tệ mới')
        .setRequired(false)
        .addChoices(
          { name: 'VND', value: 'VND' },
          { name: 'USD', value: 'USD' },
          { name: 'EUR', value: 'EUR' },
        ),
    )
    .addIntegerOption((o) =>
      o
        .setName('billing-interval')
        .setDescription('Tùy chỉnh khoảng cách chu kỳ (ghi đè lựa chọn ở trên)')
        .setRequired(false)
        .setMinValue(1),
    )
    .addStringOption((o) =>
      o
        .setName('category')
        .setDescription('Danh mục mới (chọn danh mục có sẵn hoặc gõ tên mới)')
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addStringOption((o) =>
      o.setName('notes').setDescription('Ghi chú mới').setRequired(false),
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

    const updates: Record<string, any> = {};
    const newName = interaction.options.getString('new-name');
    const cost = interaction.options.getNumber('cost');
    const nextDueDateStr = interaction.options.getString('next-due-date');
    const billingChoice = interaction.options.getString('billing-type');
    const currency = interaction.options.getString('currency');
    const billingInterval = interaction.options.getInteger('billing-interval');
    const category = interaction.options.getString('category');
    const notes = interaction.options.getString('notes');

    if (newName) updates.name = newName;
    if (cost !== null) updates.cost = cost;
    if (nextDueDateStr) updates.nextDueDate = parseDateInput(nextDueDateStr);
    if (billingChoice) {
      const [type, presetInterval] = billingChoice.split(':') as [BillingType, string];
      updates.billingType = type;
      // If no manual interval was provided, apply the preset's interval (e.g. "3 months" -> 3)
      if (billingInterval === null) updates.billingInterval = parseInt(presetInterval, 10);
    }
    if (currency) updates.currency = currency;
    if (billingInterval !== null) updates.billingInterval = billingInterval;
    if (category !== null) updates.category = category;
    if (notes !== null) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      await interaction.editReply('⚠️ Không có thông tin nào được cung cấp để cập nhật.');
      return;
    }

    const updated = await this.subscriptionService.update(sub.id, updates);

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('✏️ Subscription đã được cập nhật')
      .addFields(
        { name: 'Tên', value: updated.name, inline: true },
        { name: 'Chi phí', value: formatCurrency(updated.cost, updated.currency), inline: true },
        { name: 'Chu kỳ', value: formatBillingCycle(updated.billingType, updated.billingInterval), inline: true },
        { name: 'Ngày đến hạn', value: formatFullDate(updated.nextDueDate), inline: true },
        { name: 'Danh mục', value: updated.category || 'Không có', inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'next-due-date') {
      await interaction.respond(buildDateAutocomplete(focused.value));
      return;
    }

    if (focused.name === 'category') {
      const categories = await this.subscriptionService.searchCategories(focused.value);
      await interaction.respond(buildCategoryChoices(categories, focused.value));
      return;
    }

    const results = await this.subscriptionService.searchNames(focused.value, ['ACTIVE', 'PAUSED']);
    await interaction.respond(results.map((s) => ({ name: s.name, value: s.name })));
  }
}
