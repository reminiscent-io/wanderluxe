import { describe, it, expect } from 'vitest';
import { fmtMoney } from './format';

describe('fmtMoney', () => {
  it('formats with currency symbol and grouping', () => {
    expect(fmtMoney(1234.5, 'EUR')).toBe('€1,234.50');
    expect(fmtMoney(54, 'USD')).toBe('$54.00');
  });

  it('defaults to USD when currency is missing', () => {
    expect(fmtMoney(50, null)).toBe('$50.00');
    expect(fmtMoney(50, undefined)).toBe('$50.00');
  });

  it('falls back gracefully on invalid currency codes', () => {
    expect(fmtMoney(50, 'ZZZ@')).toBe('ZZZ@ 50.00');
  });
});
