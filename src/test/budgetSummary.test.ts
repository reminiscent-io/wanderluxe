import { describe, expect, it } from 'vitest';
import { summarizeCosts } from '../../server/lib/budgetSummary';

describe('summarizeCosts', () => {
  it('sums cost and amount_paid across rows', () => {
    const result = summarizeCosts([
      { cost: 100, currency: 'EUR', amount_paid: 40 },
      { cost: 50, currency: 'EUR', amount_paid: 10 },
    ]);
    expect(result).toEqual({ total: 150, paid: 50, currencies: ['EUR'], items: 2 });
  });

  it('returns zeroes for null input', () => {
    expect(summarizeCosts(null)).toEqual({ total: 0, paid: 0, currencies: [], items: 0 });
  });

  it('returns zeroes for an empty array', () => {
    expect(summarizeCosts([])).toEqual({ total: 0, paid: 0, currencies: [], items: 0 });
  });

  it('treats null cost and missing amount_paid as zero but still counts the item', () => {
    const result = summarizeCosts([
      { cost: null, currency: null },
      { cost: 80, currency: 'USD' },
    ]);
    expect(result).toEqual({ total: 80, paid: 0, currencies: ['USD'], items: 2 });
  });

  it('deduplicates currencies and drops nulls from the currency list', () => {
    const result = summarizeCosts([
      { cost: 10, currency: 'EUR', amount_paid: null },
      { cost: 20, currency: 'USD' },
      { cost: 30, currency: 'EUR' },
      { cost: 5, currency: null },
    ]);
    expect(result.currencies).toEqual(['EUR', 'USD']);
    expect(result.total).toBe(65);
  });
});
