/**
 * Pure currency-conversion math. No React, no Supabase — the rate table is
 * passed in so this stays trivially testable.
 */

export type RateTable = Record<string, Record<string, number>>;

/**
 * Every pair we care about is anchored on USD, because that is the only base
 * the rate feed writes for all ~150 currencies. Cross pairs (JPY -> EUR) are
 * derived by pivoting through it rather than looked up directly.
 */
export const PIVOT_CURRENCY = 'USD';

const isUsableRate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Resolve the multiplier that takes an amount from one currency to another.
 * Returns null when no chain of known rates connects the two, so callers can
 * tell "1:1" apart from "we have no idea" instead of silently showing the
 * original number under a new symbol.
 */
export function getConversionRate(
  fromCurrency: string,
  toCurrency: string,
  rates: RateTable
): number | null {
  const from = (fromCurrency || '').toUpperCase();
  const to = (toCurrency || '').toUpperCase();

  if (!from || !to) return null;
  if (from === to) return 1;

  // Direct: from -> to
  const direct = rates[from]?.[to];
  if (isUsableRate(direct)) return direct;

  // Reverse: to -> from, inverted
  const reverse = rates[to]?.[from];
  if (isUsableRate(reverse)) return 1 / reverse;

  // Pivot through USD: from -> USD -> to. Either leg may be stored in either
  // direction, so resolve each one on its own before combining them.
  if (from !== PIVOT_CURRENCY && to !== PIVOT_CURRENCY) {
    const fromToPivot = legRate(from, PIVOT_CURRENCY, rates);
    const pivotToTarget = legRate(PIVOT_CURRENCY, to, rates);
    if (fromToPivot !== null && pivotToTarget !== null) {
      return fromToPivot * pivotToTarget;
    }
  }

  return null;
}

function legRate(from: string, to: string, rates: RateTable): number | null {
  const direct = rates[from]?.[to];
  if (isUsableRate(direct)) return direct;
  const reverse = rates[to]?.[from];
  if (isUsableRate(reverse)) return 1 / reverse;
  return null;
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: RateTable
): number {
  if (!amount) return amount;

  const rate = getConversionRate(fromCurrency, toCurrency, rates);
  if (rate === null) {
    console.warn(`No conversion rate found for ${fromCurrency} to ${toCurrency}`);
    return amount;
  }

  return amount * rate;
}
