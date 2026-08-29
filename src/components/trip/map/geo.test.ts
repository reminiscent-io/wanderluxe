import { describe, it, expect } from 'vitest';
import {
  arcPath,
  boundsOf,
  coordKey,
  defaultUnits,
  formatDistance,
  haversineKm,
  kmToMi,
  midpoint,
  normalizeLng,
} from './geo';

const LAX = { lat: 33.9416, lng: -118.4085 };
const JFK = { lat: 40.6413, lng: -73.7781 };
const PARIS = { lat: 48.8566, lng: 2.3522 };
const LONDON = { lat: 51.5074, lng: -0.1278 };

describe('haversineKm', () => {
  it('matches known long-haul and short-haul distances', () => {
    expect(haversineKm(LAX, JFK)).toBeGreaterThan(3960);
    expect(haversineKm(LAX, JFK)).toBeLessThan(4000);

    expect(haversineKm(PARIS, LONDON)).toBeGreaterThan(330);
    expect(haversineKm(PARIS, LONDON)).toBeLessThan(355);
  });

  it('is zero for identical points', () => {
    expect(haversineKm(PARIS, { ...PARIS })).toBe(0);
  });

  it('is symmetric', () => {
    expect(haversineKm(LAX, JFK)).toBeCloseTo(haversineKm(JFK, LAX), 6);
  });

  it('takes the short way across the antimeridian', () => {
    // Two degrees of longitude at the equator ≈ 222.6 km, not most of the globe.
    const d = haversineKm({ lat: 0, lng: 179 }, { lat: 0, lng: -179 });
    expect(d).toBeGreaterThan(215);
    expect(d).toBeLessThan(230);
  });
});

describe('midpoint', () => {
  it('sits halfway along the great circle', () => {
    const mid = midpoint(PARIS, LONDON);
    expect(haversineKm(PARIS, mid)).toBeCloseTo(haversineKm(mid, LONDON), 3);
  });

  it('stays on the arc across the antimeridian', () => {
    const mid = midpoint({ lat: 0, lng: 179 }, { lat: 0, lng: -179 });
    expect(Math.abs(mid.lng)).toBeCloseTo(180, 4);
    expect(mid.lat).toBeCloseTo(0, 6);
  });
});

describe('arcPath', () => {
  const apexOf = (path: ReturnType<typeof arcPath>) => path[Math.floor(path.length / 2)];

  it('starts and ends exactly on the endpoints', () => {
    const path = arcPath(PARIS, LONDON);
    expect(path[0]).toEqual(PARIS);
    expect(path[path.length - 1]).toEqual(LONDON);
    expect(path).toHaveLength(33);
  });

  it('bows away from the straight chord in proportion to leg length', () => {
    // Paris→London ≈ 344 km, so a 15% bow puts the apex ~52 km off the chord.
    const offset = haversineKm(apexOf(arcPath(PARIS, LONDON)), midpoint(PARIS, LONDON));
    expect(offset).toBeGreaterThan(30);
    expect(offset).toBeLessThan(80);
  });

  it('bows to opposite sides when the direction reverses', () => {
    // Eastbound along the equator bows left of travel (north); westbound, south.
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0, lng: 10 };
    expect(apexOf(arcPath(a, b)).lat).toBeGreaterThan(0);
    expect(apexOf(arcPath(b, a)).lat).toBeLessThan(0);
  });

  it('bows wider as bowScale grows, so repeat passes nest instead of stacking', () => {
    const mid = midpoint(PARIS, LONDON);
    const single = haversineKm(apexOf(arcPath(PARIS, LONDON, 1)), mid);
    const double = haversineKm(apexOf(arcPath(PARIS, LONDON, 2)), mid);
    expect(double / single).toBeGreaterThan(1.8);
    expect(double / single).toBeLessThan(2.2);
  });

  it('falls back to the chord for identical endpoints', () => {
    expect(arcPath(PARIS, { ...PARIS })).toEqual([PARIS, PARIS]);
  });

  it('stays continuous across the antimeridian', () => {
    const path = arcPath({ lat: 10, lng: 175 }, { lat: 12, lng: -175 });
    for (let i = 1; i < path.length; i += 1) {
      expect(haversineKm(path[i - 1], path[i])).toBeLessThan(100);
    }
  });
});

describe('normalizeLng', () => {
  it('wraps into [-180, 180)', () => {
    expect(normalizeLng(190)).toBeCloseTo(-170, 9);
    expect(normalizeLng(-190)).toBeCloseTo(170, 9);
    expect(normalizeLng(0)).toBe(0);
    expect(normalizeLng(-180)).toBe(-180);
  });
});

describe('formatDistance', () => {
  it('drops to metres below a kilometre', () => {
    expect(formatDistance(0.8)).toBe('800 m');
    expect(formatDistance(0.042)).toBe('40 m');
    expect(formatDistance(0)).toBe('0 m');
  });

  it('uses one decimal in the walking-to-driving range', () => {
    expect(formatDistance(1.24)).toBe('1.2 km');
    expect(formatDistance(9.99)).toBe('10.0 km');
  });

  it('rounds to whole units for long distances', () => {
    expect(formatDistance(14.2)).toBe('14 km');
    expect(formatDistance(3974)).toBe('3,974 km');
  });

  it('converts to miles and feet', () => {
    expect(formatDistance(0.05, 'mi')).toBe('160 ft');
    expect(formatDistance(1.60934, 'mi')).toBe('1.0 mi');
    expect(formatDistance(100, 'mi')).toBe('62 mi');
  });

  it('returns empty for nonsense input', () => {
    expect(formatDistance(Number.NaN)).toBe('');
    expect(formatDistance(-1)).toBe('');
  });
});

describe('kmToMi', () => {
  it('uses the international mile', () => {
    expect(kmToMi(1.609344)).toBeCloseTo(1, 9);
  });
});

describe('defaultUnits', () => {
  it('picks miles only for US English', () => {
    expect(defaultUnits('en-US')).toBe('mi');
    expect(defaultUnits('en-GB')).toBe('km');
    expect(defaultUnits('fr-FR')).toBe('km');
    expect(defaultUnits('ja-JP')).toBe('km');
  });
});

describe('boundsOf', () => {
  it('returns null with no points', () => {
    expect(boundsOf([])).toBeNull();
  });

  it('frames a simple cluster', () => {
    const b = boundsOf([PARIS, LONDON])!;
    expect(b.north).toBeCloseTo(51.5074, 4);
    expect(b.south).toBeCloseTo(48.8566, 4);
    expect(b.west).toBeCloseTo(-0.1278, 4);
    expect(b.east).toBeCloseTo(2.3522, 4);
  });

  it('wraps rather than framing the whole globe across the antimeridian', () => {
    const b = boundsOf([
      { lat: 0, lng: 179 },
      { lat: 0, lng: -179 },
    ])!;
    // west > east is the wrapped form: the span crosses 180°, not 358° of globe.
    expect(b.west).toBeCloseTo(179, 6);
    expect(b.east).toBeCloseTo(-179, 6);
  });

  it('handles a single point', () => {
    const b = boundsOf([PARIS])!;
    expect(b.north).toBe(b.south);
  });
});

describe('coordKey', () => {
  it('merges genuinely identical coordinates', () => {
    expect(coordKey({ lat: 48.8566, lng: 2.3522 })).toBe(coordKey({ lat: 48.8566, lng: 2.3522 }));
  });

  it('keeps neighbouring places apart', () => {
    expect(coordKey({ lat: 48.8566, lng: 2.3522 })).not.toBe(
      coordKey({ lat: 48.8576, lng: 2.3522 }),
    );
  });

  it('normalizes longitude so ±180 agree', () => {
    expect(coordKey({ lat: 0, lng: 180 })).toBe(coordKey({ lat: 0, lng: -180 }));
  });
});
