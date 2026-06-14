import { BillingType } from '@prisma/client';

export function formatCurrency(amount: number, currency: string): string {
  return `${amount.toLocaleString('vi-VN')} ${currency}`;
}

export function formatBillingCycle(billingType: BillingType, interval: number): string {
  const unit = { DAY: 'ngày', WEEK: 'tuần', MONTH: 'tháng', YEAR: 'năm' }[billingType];
  return interval === 1 ? `Mỗi ${unit}` : `Mỗi ${interval} ${unit}`;
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[*_`~|>]/g, '\\$&');
}

export function padEnd(text: string, length: number): string {
  return text.padEnd(length, ' ');
}
