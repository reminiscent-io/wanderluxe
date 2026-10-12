import { describe, expect, it } from 'vitest';
import { geocodeCandidates } from '../../supabase/functions/weather-proxy/geocodeCandidates';

describe('geocodeCandidates', () => {
  it('keeps a plain city query as the only candidate', () => {
    expect(geocodeCandidates('Paris, France')).toEqual(['Paris, France']);
  });

  it('strips postal codes and falls back to the nearest town', () => {
    expect(geocodeCandidates('Elmau, 82493 Krün, Germany')).toEqual([
      'Elmau, 82493 Krün, Germany',
      'Elmau, Krün, Germany',
      'Krün, Germany',
    ]);
  });

  it('never falls back to the country alone', () => {
    expect(geocodeCandidates('82493 Elmau, Germany')).toEqual([
      '82493 Elmau, Germany',
      'Elmau, Germany',
    ]);
    expect(geocodeCandidates('Japan')).toEqual(['Japan']);
  });

  it('returns nothing for a blank destination', () => {
    expect(geocodeCandidates('   ')).toEqual([]);
  });
});
