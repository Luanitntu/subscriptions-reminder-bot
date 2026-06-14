import { BillingType } from '@prisma/client';

// Normalize one cycle's cost to an average monthly cost for consistent comparison.
export function monthlyEquivalent(cost: number, billingType: BillingType, interval: number): number {
  switch (billingType) {
    case BillingType.DAY:
      return (cost * (365 / 12)) / interval;
    case BillingType.WEEK:
      return (cost * (52 / 12)) / interval;
    case BillingType.MONTH:
      return cost / interval;
    case BillingType.YEAR:
      return cost / (12 * interval);
    default:
      return cost / interval;
  }
}
