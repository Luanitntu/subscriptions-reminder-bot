import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { BillingType } from '@prisma/client';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

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

// Accept DD/MM/YYYY (preferred) plus a few variants; parse strictly to avoid ambiguity.
const DATE_INPUT_FORMATS = ['DD/MM/YYYY', 'D/M/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD'];

export function parseDateInput(input: string): Date {
  const trimmed = (input || '').trim();
  for (const fmt of DATE_INPUT_FORMATS) {
    const parsed = dayjs(trimmed, fmt, true);
    if (parsed.isValid()) return parsed.startOf('day').toDate();
  }
  throw new Error(`Ngày không hợp lệ: "${input}". Định dạng đúng: DD/MM/YYYY (ví dụ: 13/07/2026).`);
}

// Date suggestions for autocomplete (a "calendar picker" within Discord's limits).
export function buildDateAutocomplete(typed: string): { name: string; value: string }[] {
  const results: { name: string; value: string }[] = [];
  const trimmed = (typed || '').trim();

  if (trimmed) {
    try {
      const formatted = formatFullDate(parseDateInput(trimmed));
      results.push({ name: `✅ Dùng ngày: ${formatted}`, value: formatted });
    } catch {
      // ignore when the input is incomplete/invalid
    }
  }

  const today = getTodayInTz();
  const presets: { label: string; date: dayjs.Dayjs }[] = [
    { label: 'Hôm nay', date: today },
    { label: 'Ngày mai', date: today.add(1, 'day') },
    { label: '+1 tuần', date: today.add(1, 'week') },
    { label: '+2 tuần', date: today.add(2, 'week') },
    { label: '+1 tháng', date: today.add(1, 'month') },
    { label: '+3 tháng', date: today.add(3, 'month') },
    { label: '+6 tháng', date: today.add(6, 'month') },
    { label: '+1 năm', date: today.add(1, 'year') },
  ];

  for (const p of presets) {
    const formatted = p.date.format('DD/MM/YYYY');
    if (results.some((r) => r.value === formatted)) continue;
    results.push({ name: `${p.label} — ${formatted}`, value: formatted });
  }

  return results.slice(0, 25);
}
