import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { BillingType } from '@prisma/client';

dayjs.extend(utc);
dayjs.extend(timezone);

export function getTodayInTz(): dayjs.Dayjs {
  const tz = process.env.TIMEZONE || 'Asia/Ho_Chi_Minh';
  return dayjs().tz(tz).startOf('day');
}

export function calculateNextDueDate(
  currentDue: Date,
  billingType: BillingType,
  billingInterval: number,
): Date {
  const date = dayjs(currentDue);
  switch (billingType) {
    case BillingType.DAY:
      return date.add(billingInterval, 'day').toDate();
    case BillingType.WEEK:
      return date.add(billingInterval, 'week').toDate();
    case BillingType.MONTH:
      return date.add(billingInterval, 'month').toDate();
    case BillingType.YEAR:
      return date.add(billingInterval, 'year').toDate();
    default:
      return date.add(billingInterval, 'month').toDate();
  }
}

export function getDaysUntilDue(dueDate: Date): number {
  const today = getTodayInTz();
  const due = dayjs(dueDate).startOf('day');
  return due.diff(today, 'day');
}

export function formatShortDate(date: Date): string {
  return dayjs(date).format('DD/MM');
}

export function formatFullDate(date: Date): string {
  return dayjs(date).format('DD/MM/YYYY');
}

export function parseDateInput(input: string): Date {
  const parsed = dayjs(input, 'YYYY-MM-DD');
  if (!parsed.isValid()) throw new Error(`Invalid date format: ${input}. Use YYYY-MM-DD.`);
  return parsed.toDate();
}
