import { BillingType } from '@prisma/client';

export class UpdateSubscriptionDto {
  name?: string;
  category?: string;
  notes?: string;
  cost?: number;
  currency?: string;
  billingType?: BillingType;
  billingInterval?: number;
  nextDueDate?: Date;
  isAutoRenew?: boolean;
}
