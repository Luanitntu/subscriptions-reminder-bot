import { Injectable } from '@nestjs/common';
import { Subscription } from '@prisma/client';
import { EmbedBuilder } from 'discord.js';
import dayjs from 'dayjs';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { formatCurrency } from '../../shared/utils/format.util';
import { formatFullDate, getDaysUntilDue } from '../../shared/utils/date.util';

export type NotificationType = 'REMINDER_3' | 'REMINDER_2' | 'REMINDER_1' | 'DUE_TODAY' | 'OVERDUE';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async hasBeenSentToday(subscriptionId: string, notificationType: NotificationType): Promise<boolean> {
    const startOfToday = dayjs().startOf('day').toDate();
    const startOfTomorrow = dayjs().add(1, 'day').startOf('day').toDate();

    const log = await this.prisma.notificationLog.findFirst({
      where: {
        subscriptionId,
        notificationType,
        sentDate: { gte: startOfToday, lt: startOfTomorrow },
      },
    });

    return !!log;
  }

  async logNotification(subscriptionId: string, notificationType: NotificationType): Promise<void> {
    await this.prisma.notificationLog.create({
      data: {
        subscriptionId,
        notificationType,
        sentDate: new Date(),
      },
    });
  }

  buildReminderEmbed(sub: Subscription): EmbedBuilder {
    const daysUntilDue = getDaysUntilDue(sub.nextDueDate);
    const costStr = formatCurrency(sub.cost, sub.currency);
    const dueDateStr = formatFullDate(sub.nextDueDate);
    const categoryStr = sub.category ? ` · ${sub.category}` : '';

    let color: number;
    let emoji: string;
    let title: string;
    let timeDesc: string;

    if (daysUntilDue < 0) {
      const daysOverdue = Math.abs(daysUntilDue);
      color = 0xff0000;
      emoji = '⚠️';
      title = 'Quá hạn thanh toán';
      timeDesc = `Quá hạn **${daysOverdue} ngày** (đến hạn: ${dueDateStr})`;
    } else if (daysUntilDue === 0) {
      color = 0xff6600;
      emoji = '⚠️';
      title = 'Đến hạn thanh toán hôm nay';
      timeDesc = `Đến hạn hôm nay (${dueDateStr})`;
    } else if (daysUntilDue === 1) {
      color = 0xff3333;
      emoji = '🔴';
      title = 'Ngày mai đến hạn';
      timeDesc = `Còn **1 ngày** (${dueDateStr})`;
    } else if (daysUntilDue === 2) {
      color = 0xffcc00;
      emoji = '🟡';
      title = 'Còn 2 ngày đến hạn';
      timeDesc = `Còn **2 ngày** (${dueDateStr})`;
    } else {
      color = 0x00cc44;
      emoji = '🟢';
      title = 'Còn 3 ngày đến hạn';
      timeDesc = `Còn **3 ngày** (${dueDateStr})`;
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} ${title}`)
      .setDescription(`**${sub.name}**${categoryStr}`)
      .addFields(
        { name: '💰 Chi phí', value: costStr, inline: true },
        { name: '📅 Ngày đến hạn', value: timeDesc, inline: false },
      )
      .setTimestamp();
  }

  getNotificationType(daysUntilDue: number): NotificationType | null {
    if (daysUntilDue === 3) return 'REMINDER_3';
    if (daysUntilDue === 2) return 'REMINDER_2';
    if (daysUntilDue === 1) return 'REMINDER_1';
    if (daysUntilDue === 0) return 'DUE_TODAY';
    if (daysUntilDue < 0) return 'OVERDUE';
    return null;
  }
}
