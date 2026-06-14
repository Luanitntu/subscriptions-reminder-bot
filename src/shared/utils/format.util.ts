import { BillingType } from '@prisma/client';

export function formatCurrency(amount: number, currency: string): string {
  return `${amount.toLocaleString('vi-VN')} ${currency}`;
}

export function formatNumber(amount: number): string {
  return Math.round(amount).toLocaleString('vi-VN');
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

// Friendly Vietnamese billing label: "Hàng tháng", "6 tháng", "Hàng năm"...
export function formatBillingLabel(billingType: BillingType, interval: number): string {
  if (interval === 1) {
    return { DAY: 'Hàng ngày', WEEK: 'Hàng tuần', MONTH: 'Hàng tháng', YEAR: 'Hàng năm' }[billingType];
  }
  const unit = { DAY: 'ngày', WEEK: 'tuần', MONTH: 'tháng', YEAR: 'năm' }[billingType];
  return `${interval} ${unit}`;
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

// Render an aligned monospace ASCII table (for .txt exports / code blocks).
export function renderTextTable(
  headers: string[],
  rows: string[][],
  aligns: ('left' | 'right')[] = [],
  totalRow?: string[],
): string {
  const measure = (s: string) => (s ?? '').normalize('NFC').length;
  const widths = headers.map((_, i) =>
    Math.max(measure(headers[i]), ...rows.map((r) => measure(r[i])), totalRow ? measure(totalRow[i]) : 0),
  );

  const pad = (text: string, i: number) => {
    const t = (text ?? '').normalize('NFC');
    const space = ' '.repeat(Math.max(0, widths[i] - t.length));
    return aligns[i] === 'right' ? space + t : t + space;
  };

  const line = (cells: string[]) => cells.map((c, i) => pad(c, i)).join(' | ');
  const sep = widths.map((w) => '-'.repeat(w)).join('-+-');

  const out = [line(headers), sep, ...rows.map(line)];
  if (totalRow) out.push(sep, line(totalRow));
  return out.join('\n');
}
