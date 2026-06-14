import { Injectable } from '@nestjs/common';
import { Subscription, PaymentHistory } from '@prisma/client';
import { formatFullDate } from '../../shared/utils/date.util';
import { monthlyEquivalent } from '../../shared/utils/billing.util';
import {
  formatCurrency,
  formatNumber,
  formatBillingLabel,
  renderTextTable,
} from '../../shared/utils/format.util';

type PaymentHistoryWithSub = PaymentHistory & { subscription: { name: string } };

@Injectable()
export class ExportService {
  // ---------- CSV ----------

  generateSubscriptionsCsv(subscriptions: Subscription[]): Buffer {
    const headers = 'Name,Category,Cost,Currency,BillingType,BillingInterval,NextDueDate,Status';
    const rows = subscriptions.map((s) => {
      const name = this.escapeCsv(s.name);
      const category = this.escapeCsv(s.category || '');
      const nextDue = formatFullDate(s.nextDueDate);
      return `${name},${category},${s.cost},${s.currency},${s.billingType},${s.billingInterval},${nextDue},${s.status}`;
    });
    return Buffer.from([headers, ...rows].join('\n'), 'utf-8');
  }

  generatePaymentHistoryCsv(history: PaymentHistoryWithSub[]): Buffer {
    const headers = 'Subscription,Amount,PaidDate,Note';
    const rows = history.map((h) => {
      const name = this.escapeCsv(h.subscription.name);
      const note = this.escapeCsv(h.note || '');
      const paidAt = formatFullDate(h.paidAt);
      return `${name},${h.paidAmount},${paidAt},${note}`;
    });
    return Buffer.from([headers, ...rows].join('\n'), 'utf-8');
  }

  // ---------- Text table (.txt) ----------

  generateSubscriptionsTable(subscriptions: Subscription[]): Buffer {
    const monthlyByCurrency = new Map<string, number>();

    const rows = subscriptions.map((s) => {
      const monthly = monthlyEquivalent(s.cost, s.billingType, s.billingInterval);
      monthlyByCurrency.set(s.currency, (monthlyByCurrency.get(s.currency) || 0) + monthly);
      return [
        s.name,
        s.category || '-',
        formatCurrency(s.cost, s.currency),
        formatBillingLabel(s.billingType, s.billingInterval),
        formatCurrency(Math.round(monthly), s.currency),
        formatFullDate(s.nextDueDate),
        s.status,
      ];
    });

    const totalStr =
      [...monthlyByCurrency.entries()]
        .map(([cur, amt]) => formatCurrency(Math.round(amt), cur))
        .join(' + ') || '0';

    const table = renderTextTable(
      ['Sub', 'Danh mục', 'Giá', 'Chu kỳ', 'Quy đổi/tháng', 'Đến hạn', 'Trạng thái'],
      rows,
      ['left', 'left', 'right', 'left', 'right', 'left', 'left'],
      ['Tổng', '', '', '', totalStr, '', ''],
    );

    const content = [
      `SUBSCRIPTIONS — ${formatFullDate(new Date())}`,
      'Quy đổi/tháng = chi phí trung bình mỗi tháng theo chu kỳ thanh toán',
      '',
      table,
      '',
    ].join('\n');

    return Buffer.from(content, 'utf-8');
  }

  generatePaymentHistoryTable(history: PaymentHistoryWithSub[]): Buffer {
    let total = 0;
    const rows = history.map((h) => {
      total += h.paidAmount;
      return [h.subscription.name, formatNumber(h.paidAmount), formatFullDate(h.paidAt), h.note || '-'];
    });

    const table = renderTextTable(
      ['Sub', 'Số tiền', 'Ngày trả', 'Ghi chú'],
      rows,
      ['left', 'right', 'left', 'left'],
      ['Tổng', formatNumber(total), '', ''],
    );

    const content = [`PAYMENT HISTORY — ${formatFullDate(new Date())}`, '', table, ''].join('\n');
    return Buffer.from(content, 'utf-8');
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
