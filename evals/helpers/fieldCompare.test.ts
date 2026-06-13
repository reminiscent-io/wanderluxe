// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { compareFields, fieldMatches, normalizeLoose } from './fieldCompare';

describe('normalizeLoose', () => {
  it('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalizeLoose('  228 Rue de Rivoli, 75001 Paris!  ')).toBe('228 rue de rivoli 75001 paris');
  });

  it('folds accents so "Hôtel" matches "Hotel"', () => {
    expect(normalizeLoose('Hôtel Le Meurice')).toBe('hotel le meurice');
  });
});

describe('fieldMatches', () => {
  it('exact rule: strict string equality after String() coercion', () => {
    expect(fieldMatches('2026-09-14', '2026-09-14', 'exact')).toBe(true);
    expect(fieldMatches('2026-09-14', '2026-09-15', 'exact')).toBe(false);
    expect(fieldMatches(1200, 1200, 'exact')).toBe(true);
    expect(fieldMatches(1200, '1200', 'exact')).toBe(true);
  });

  it('fuzzy rule: case/punctuation-insensitive containment in either direction', () => {
    expect(fieldMatches('Hôtel Le Meurice', 'Le Meurice', 'fuzzy')).toBe(true);
    expect(fieldMatches('Le Meurice', 'Hôtel Le Meurice, Paris', 'fuzzy')).toBe(true);
    expect(fieldMatches('Septime', 'Le Cinq', 'fuzzy')).toBe(false);
  });

  it('null expectation matches null/undefined/empty actuals', () => {
    expect(fieldMatches(null, null, 'exact')).toBe(true);
    expect(fieldMatches(null, undefined, 'exact')).toBe(true);
    expect(fieldMatches(null, '', 'fuzzy')).toBe(true);
    expect(fieldMatches(null, 'something', 'exact')).toBe(false);
  });
});

describe('compareFields', () => {
  it('computes accuracy and per-field results', () => {
    const { accuracy, fields } = compareFields(
      { name: 'Hôtel Le Meurice', check_in_date: '2026-09-14', cost: 1200 },
      { name: 'Hotel Le Meurice Paris', check_in_date: '2026-09-15', cost: 1200 },
      { name: 'fuzzy' },
    );
    expect(accuracy).toBeCloseTo(2 / 3);
    const byField = Object.fromEntries(fields.map((f) => [f.field, f.match]));
    expect(byField).toEqual({ name: true, check_in_date: false, cost: true });
  });

  it('defaults unlisted fields to the exact rule', () => {
    const { fields } = compareFields({ code: 'AB-1' }, { code: 'ab-1' }, {});
    expect(fields[0].match).toBe(false);
  });
});
