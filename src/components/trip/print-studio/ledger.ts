import type { PdfTripData } from '@/services/pdf/types';

/** Whether the trip has anything for the Ledger to show: costs, or a budget to hold them against. */
export function hasLedgerData(data: PdfTripData): boolean {
  return data.budgetData.total > 0 || data.budgetData.budget != null;
}
