import { describe, it, expect } from 'vitest';
import { computeCoverCrop, computeOutputSize } from './images';

describe('computeCoverCrop (CSS object-fit: cover semantics)', () => {
  it('crops a portrait source vertically to fill a wide box', () => {
    // 400x600 portrait into a 564x250 banner (the audit's stretched-cover case)
    const crop = computeCoverCrop(400, 600, 564, 250);
    expect(crop).toEqual({ sx: 0, sy: 212, sw: 400, sh: 177 });
  });

  it('crops a landscape source horizontally to fill a square box', () => {
    const crop = computeCoverCrop(1600, 900, 28, 28);
    expect(crop).toEqual({ sx: 350, sy: 0, sw: 900, sh: 900 });
  });

  it('returns the full source when aspect ratios already match', () => {
    const crop = computeCoverCrop(1128, 500, 564, 250);
    expect(crop).toEqual({ sx: 0, sy: 0, sw: 1128, sh: 500 });
  });
});

describe('computeOutputSize', () => {
  it('supersamples to scale x the box for print sharpness', () => {
    const crop = { sx: 0, sy: 0, sw: 2256, sh: 1000 };
    expect(computeOutputSize(crop, 564, 250, 2)).toEqual({ w: 1128, h: 500 });
  });

  it('never upscales beyond the source crop width', () => {
    const crop = { sx: 0, sy: 212, sw: 400, sh: 177 };
    // 2x of 564 would be 1128, but the source only has 400px across
    expect(computeOutputSize(crop, 564, 250, 2)).toEqual({ w: 400, h: 177 });
  });

  it('keeps the box aspect ratio in the output bitmap', () => {
    const { w, h } = computeOutputSize({ sx: 0, sy: 0, sw: 5000, sh: 5000 }, 28, 28, 3);
    expect(w).toBe(84);
    expect(h).toBe(84);
  });
});
