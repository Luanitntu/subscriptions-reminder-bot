import { BillingType } from '@prisma/client';

export class CreateSubscriptionDto {
  name: string;
  category?: string;
  notes?: string;
  cost: number;
  currency: string;
  billingType: BillingType;
  billingInterval: number;
  nextDueDate: Date;
  isAutoRenew?: boolean;
}
