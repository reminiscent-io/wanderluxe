import { describe, it, expect } from 'vitest';
import { TYPE, SPACE, COLORS, PAGE, FONTS, innerPageWidth } from './theme';

describe('pdf theme tokens', () => {
  it('type scale is strictly descending and print-legible (>= 8.5pt)', () => {
    const ordered = [TYPE.display, TYPE.title, TYPE.section, TYPE.body, TYPE.detail, TYPE.caption];
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]).toBeLessThan(ordered[i - 1]);
    }
    expect(TYPE.caption).toBeGreaterThanOrEqual(8.5);
  });

  it('page margins meet the 36pt printer safe zone', () => {
    for (const m of PAGE.margins) expect(m).toBeGreaterThanOrEqual(36);
  });

  it('spacing scale is ascending', () => {
    const ordered = [SPACE.xs, SPACE.sm, SPACE.md, SPACE.lg, SPACE.xl, SPACE.xxl];
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]).toBeGreaterThan(ordered[i - 1]);
    }
  });

  it('colors are 6-digit hex (pdfmake requirement)', () => {
    for (const c of Object.values(COLORS)) expect(c).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('computes inner page width from page size and margins', () => {
    expect(innerPageWidth('LETTER', [40, 48, 40, 48])).toBe(532);
    expect(innerPageWidth('A4', [40, 48, 40, 48])).toBeCloseTo(515.28, 2);
  });

  it('exposes font family names matching pdf-fonts registration', () => {
    expect(FONTS.serif).toBe('DMSerifDisplay');
    expect(FONTS.sans).toBe('DMSans');
  });
});
