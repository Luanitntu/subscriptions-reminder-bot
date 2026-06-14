import { BillingType } from '@prisma/client';

export function formatCurrency(amount: number, currency: string): string {
  return `${amount.toLocaleString('vi-VN')} ${currency}`;
}

export function formatBillingCycle(billingType: BillingType, interval: number): string {
  const unit = { DAY: 'ngày', WEEK: 'tuần', MONTH: 'tháng', YEAR: 'năm' }[billingType];
  return interval === 1 ? `Mỗi ${unit}` : `Mỗi ${interval} ${unit}`;
}

export function formatBillingCycleEn(billingType: BillingType, interval: number): string {
  if (interval === 1) {
    return { DAY: 'Daily', WEEK: 'Weekly', MONTH: 'Monthly', YEAR: 'Yearly' }[billingType];
  }
  const unit = { DAY: 'days', WEEK: 'weeks', MONTH: 'months', YEAR: 'years' }[billingType];
  return `Every ${interval} ${unit}`;
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[*_`~|>]/g, '\\$&');
}

// Category suggestions: existing categories + a "create new" option when typing an unknown name.
export function buildCategoryChoices(existing: string[], typed: string): { name: string; value: string }[] {
  const trimmed = (typed || '').trim();
  const choices = existing.map((c) => ({ name: c, value: c }));
  if (trimmed && !existing.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    choices.unshift({ name: `➕ Tạo mới: ${trimmed}`, value: trimmed });
  }
  return choices.slice(0, 25);
}

export function padEnd(text: string, length: number): string {
  return text.padEnd(length, ' ');
}
