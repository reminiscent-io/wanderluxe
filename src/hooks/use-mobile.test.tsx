// Regression cover for the first-render correctness of the viewport hooks.
//
// The previous implementation resolved the match in an effect, so the first
// render always reported "not mobile" regardless of the real viewport. Consumers
// that branch their layout on it (the map, the calendar toolbar) rendered the
// desktop tree once on a phone and then swapped.
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useIsMobile } from './use-mobile';

type Listener = (event: MediaQueryListEvent) => void;

/** Minimal matchMedia stand-in that can flip a query and notify subscribers. */
const installMatchMedia = (initial: Record<string, boolean>) => {
  const state = { ...initial };
  const listeners = new Map<string, Set<Listener>>();

  const emit = (query: string, matches: boolean) => {
    state[query] = matches;
    listeners.get(query)?.forEach((listener) => listener({ matches } as MediaQueryListEvent));
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      get matches() {
        return state[query] ?? false;
      },
      media: query,
      onchange: null as MediaQueryList['onchange'],
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_: string, listener: Listener) => {
        if (!listeners.has(query)) listeners.set(query, new Set());
        listeners.get(query)!.add(listener);
      },
      removeEventListener: (_: string, listener: Listener) => {
        listeners.get(query)?.delete(listener);
      },
      dispatchEvent: vi.fn(),
    }),
  });

  return { emit };
};

const MOBILE_QUERY = '(max-width: 767px)';
const COARSE_QUERY = '(pointer: coarse)';

describe('useIsMobile', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    // The hooks memoise one MediaQueryList per query, so each test needs a fresh
    // module instance to avoid inheriting the previous test's cached list.
    vi.resetModules();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('reports mobile on the very first render pass, before any effect runs', async () => {
    installMatchMedia({ [MOBILE_QUERY]: true });
    const { useIsMobile: freshUseIsMobile } = await import('./use-mobile');

    // Record every render rather than reading `result.current`: renderHook
    // flushes effects inside act(), so the settled value would look correct even
    // under the old effect-based implementation. The bug is the *first* value.
    const seen: boolean[] = [];
    renderHook(() => {
      const value = freshUseIsMobile();
      seen.push(value);
      return value;
    });

    expect(seen[0]).toBe(true);
    expect(seen).not.toContain(false);
  });

  it('reports desktop when the viewport is wide', async () => {
    installMatchMedia({ [MOBILE_QUERY]: false });
    const { useIsMobile: freshUseIsMobile } = await import('./use-mobile');

    const { result } = renderHook(() => freshUseIsMobile());

    expect(result.current).toBe(false);
  });

  it('updates when the viewport crosses the breakpoint', async () => {
    const { emit } = installMatchMedia({ [MOBILE_QUERY]: false });
    const { useIsMobile: freshUseIsMobile } = await import('./use-mobile');

    const { result } = renderHook(() => freshUseIsMobile());
    expect(result.current).toBe(false);

    act(() => emit(MOBILE_QUERY, true));

    expect(result.current).toBe(true);
  });

  it('falls back to desktop when matchMedia is unavailable (prerender)', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });
});

describe('useIsCoarsePointer', () => {
  it('tracks pointer coarseness independently of width', async () => {
    // A touch laptop: wide viewport, coarse pointer. The two hooks must disagree,
    // which is why interaction models key off this one rather than useIsMobile.
    installMatchMedia({ [MOBILE_QUERY]: false, [COARSE_QUERY]: true });
    vi.resetModules();
    const mod = await import('./use-mobile');

    const { result: coarse } = renderHook(() => mod.useIsCoarsePointer());
    const { result: mobile } = renderHook(() => mod.useIsMobile());

    expect(coarse.current).toBe(true);
    expect(mobile.current).toBe(false);
  });

  it('is false for precise pointers', async () => {
    installMatchMedia({ [COARSE_QUERY]: false });
    vi.resetModules();
    const mod = await import('./use-mobile');

    const { result } = renderHook(() => mod.useIsCoarsePointer());

    expect(result.current).toBe(false);
  });
});
