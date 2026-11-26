import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import PasteDemo, { PASTE_DEMO_STEPS } from './PasteDemo';

function setReducedMotion(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      }) as unknown as MediaQueryList,
  );
}

function visibleRows() {
  return screen.getAllByRole('listitem');
}

describe('PasteDemo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows the finished day straight away under reduced motion', () => {
    setReducedMotion(true);
    render(<PasteDemo />);
    expect(visibleRows()).toHaveLength(PASTE_DEMO_STEPS.length);
    expect(screen.queryByRole('button', { name: 'Replay' })).toBeNull();
  });

  it('starts empty and waits to be scrolled into view', () => {
    setReducedMotion(false);
    render(<PasteDemo />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('replays from an empty day', () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    const observers: IntersectionObserverCallback[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          observers.push(cb);
        }
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    render(<PasteDemo />);
    act(() => {
      observers[0]([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    // Each tick schedules the next, so advance one timer at a time.
    for (let i = 0; i < 400 && !screen.queryByRole('button', { name: 'Replay' }); i++) {
      act(() => {
        vi.runOnlyPendingTimers();
      });
    }
    expect(visibleRows()).toHaveLength(PASTE_DEMO_STEPS.length);

    act(() => {
      screen.getByRole('button', { name: 'Replay' }).click();
    });
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    vi.unstubAllGlobals();
  });
});
