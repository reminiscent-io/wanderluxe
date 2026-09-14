import { describe, it, expect } from 'vitest';
import { groupByRegion, regionFor } from './regions';

describe('regionFor', () => {
  it('reads the country from the destination tail', () => {
    expect(regionFor('Tokyo, Japan')).toBe('Asia & Pacific');
    expect(regionFor('Sabi Sands & Cape Town, South Africa')).toBe('Africa & Middle East');
    expect(regionFor('St. Barthélemy, French West Indies')).toBe('Americas');
    expect(regionFor('Porto Cervo, Italy')).toBe('Europe');
  });

  it('copes with a bare place and with an unknown country', () => {
    expect(regionFor('Dubai')).toBe('Africa & Middle East');
    expect(regionFor('Bali')).toBe('Asia & Pacific');
    expect(regionFor('Atlantis, Lemuria')).toBe('More destinations');
    expect(regionFor(null)).toBe('More destinations');
  });
});

describe('groupByRegion', () => {
  it('keeps the canonical region order and drops empty regions', () => {
    const groups = groupByRegion(
      [{ d: 'Marrakech, Morocco' }, { d: 'Paris, France' }, { d: 'Kyoto, Japan' }, { d: 'Rome, Italy' }],
      (t) => t.d,
    );
    expect(groups.map((g) => g.region)).toEqual(['Europe', 'Asia & Pacific', 'Africa & Middle East']);
    expect(groups[0].items.map((t) => t.d)).toEqual(['Paris, France', 'Rome, Italy']);
  });
});
