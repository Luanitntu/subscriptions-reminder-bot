import { Injectable } from '@nestjs/common';
import { Subscription, PaymentHistory } from '@prisma/client';
import { formatFullDate } from '../../shared/utils/date.util';

type PaymentHistoryWithSub = PaymentHistory & { subscription: { name: string } };

@Injectable()
export class ExportService {
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

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
