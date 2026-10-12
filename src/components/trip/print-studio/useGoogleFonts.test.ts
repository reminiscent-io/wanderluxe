import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { FONT_PAIRINGS } from '@/lib/printDesign/spec';
import { FONT_WAIT_MS, fontFacesFor, useGoogleFonts } from './useGoogleFonts';

const firstFamily = (stack: string) => stack.match(/'([^']+)'/)?.[1];

describe('fontFacesFor', () => {
  it('reads plain weight lists', () => {
    expect(fontFacesFor('family=DM+Serif+Display&family=DM+Sans:wght@400;500;700')).toEqual([
      '400 16px "DM Serif Display"',
      '400 16px "DM Sans"',
      '500 16px "DM Sans"',
      '700 16px "DM Sans"',
    ]);
  });

  it('picks the weight out of a multi-axis tuple', () => {
    expect(fontFacesFor('family=Fraunces:opsz,wght@9..144,400;9..144,600')).toEqual([
      '400 16px "Fraunces"',
      '600 16px "Fraunces"',
    ]);
  });

  it.each(FONT_PAIRINGS.map((p) => [p.id, p] as const))('covers both faces of the %s pairing', (_id, pairing) => {
    const faces = fontFacesFor(pairing.googleQuery);
    for (const face of faces) expect(face).toMatch(/^\d{3} 16px "[^"]+"$/);
    const families = new Set(faces.map((f) => f.match(/"([^"]+)"/)?.[1]));
    expect(families).toEqual(new Set([firstFamily(pairing.display), firstFamily(pairing.body)]));
  });
});

describe('useGoogleFonts', () => {
  const query = 'family=Marcellus&family=Nunito+Sans:wght@400;600';
  const stylesheet = () =>
    document.head.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href*="fonts.googleapis.com"]');

  afterEach(() => {
    vi.useRealTimers();
    delete (document as { fonts?: unknown }).fonts;
  });

  it('reports ready once the stylesheet and every declared face have loaded', async () => {
    const load = vi.fn((_face: string) => Promise.resolve([]));
    Object.defineProperty(document, 'fonts', { value: { load, ready: Promise.resolve() }, configurable: true });

    const { result } = renderHook(() => useGoogleFonts(query));
    expect(result.current).toBe(false);

    await act(async () => {
      stylesheet()!.dispatchEvent(new Event('load'));
    });

    expect(load.mock.calls.map(([face]) => face)).toEqual([
      '400 16px "Marcellus"',
      '400 16px "Nunito Sans"',
      '600 16px "Nunito Sans"',
    ]);
    expect(result.current).toBe(true);
  });

  it('gives up waiting rather than holding the Print button forever', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGoogleFonts(query));
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(FONT_WAIT_MS);
    });
    expect(result.current).toBe(true);
  });

  it('removes its links on unmount', () => {
    const { unmount } = renderHook(() => useGoogleFonts(query));
    expect(stylesheet()).not.toBeNull();
    unmount();
    expect(stylesheet()).toBeNull();
  });
});
