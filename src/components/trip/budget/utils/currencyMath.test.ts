import { describe, it, expect } from 'vitest';
import { getConversionRate, convertCurrency, type RateTable } from './currencyMath';

// Mirrors what the feed actually stores: USD-anchored rows for every currency,
// plus a cross matrix for the currencies the picker offers.
const USD_ANCHORED: RateTable = {
  USD: { EUR: 0.856, JPY: 158.879, MAD: 9.2091 },
};

describe('getConversionRate', () => {
  it('returns 1 for the same currency, case-insensitively', () => {
    expect(getConversionRate('usd', 'USD', {})).toBe(1);
  });

  it('uses a direct rate when one exists', () => {
    expect(getConversionRate('USD', 'JPY', USD_ANCHORED)).toBe(158.879);
  });

  it('inverts a reverse rate when only the opposite direction is stored', () => {
    expect(getConversionRate('JPY', 'USD', USD_ANCHORED)).toBeCloseTo(1 / 158.879, 12);
  });

  it('pivots through USD for cross pairs with no stored row', () => {
    // This is the case that was broken: only USD-from rows exist, so JPY -> EUR
    // has neither a direct nor a reverse rate.
    const rate = getConversionRate('JPY', 'EUR', USD_ANCHORED);
    expect(rate).toBeCloseTo(0.856 / 158.879, 12);
  });

  it('pivots for currencies outside the display picker', () => {
    expect(getConversionRate('MAD', 'EUR', USD_ANCHORED)).toBeCloseTo(0.856 / 9.2091, 12);
  });

  it('prefers a stored cross rate over the pivot', () => {
    const withCross: RateTable = { ...USD_ANCHORED, JPY: { EUR: 0.005 } };
    expect(getConversionRate('JPY', 'EUR', withCross)).toBe(0.005);
  });

  it('returns null when nothing connects the two currencies', () => {
    expect(getConversionRate('JPY', 'EUR', {})).toBeNull();
    expect(getConversionRate('ZAR', 'EUR', USD_ANCHORED)).toBeNull();
  });

  it('ignores unusable stored rates instead of producing Infinity or NaN', () => {
    const broken = { USD: { JPY: 0 }, JPY: { USD: 0 } } as unknown as RateTable;
    expect(getConversionRate('USD', 'JPY', broken)).toBeNull();
  });
});

describe('convertCurrency', () => {
  it('converts yen to dollars', () => {
    expect(convertCurrency(15887.9, 'JPY', 'USD', USD_ANCHORED)).toBeCloseTo(100, 6);
  });

  it('converts yen to euros through the USD pivot', () => {
    expect(convertCurrency(158879, 'JPY', 'EUR', USD_ANCHORED)).toBeCloseTo(856, 6);
  });

  it('leaves the amount alone when no rate is available', () => {
    expect(convertCurrency(1234, 'ZAR', 'EUR', USD_ANCHORED)).toBe(1234);
  });

  it('short-circuits zero amounts', () => {
    expect(convertCurrency(0, 'JPY', 'USD', USD_ANCHORED)).toBe(0);
  });
});
