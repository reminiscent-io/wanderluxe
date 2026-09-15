import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup();
});

// These mocks only apply in browser-like environments (jsdom).
// Node-environment tests (e.g. evals/helpers) skip this block.
if (globalThis.window !== undefined) {
  // Mock window.matchMedia
  Object.defineProperty(globalThis.window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock ResizeObserver / IntersectionObserver. These have to be real classes:
  // production code calls `new ResizeObserver(...)`, and a `vi.fn()` wrapping an
  // arrow implementation throws "is not a constructor" under `new`.
  // The constructors take the real APIs' arguments, since every call site passes
  // them. The callbacks are kept but never invoked, so observers stay inert.
  globalThis.ResizeObserver = class {
    callback: ResizeObserverCallback;
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
  } as unknown as typeof ResizeObserver;

  globalThis.IntersectionObserver = class {
    callback: IntersectionObserverCallback;
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
    root: Element | Document | null;
    rootMargin: string;
    thresholds: number[];
    constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
      this.callback = callback;
      this.root = options.root ?? null;
      this.rootMargin = options.rootMargin ?? '';
      const threshold = options.threshold ?? 0;
      this.thresholds = Array.isArray(threshold) ? threshold : [threshold];
    }
  } as unknown as typeof IntersectionObserver;

  // nwsapi 2.2.27 answers `:modal` by calling element.matches(':modal') again,
  // which in jsdom is nwsapi itself, so each call recurses to a stack overflow
  // (~250ms). floating-ui asks while positioning every Radix popover, making one
  // open take ~10s. jsdom has no top layer, so nothing can match `:modal` anyway.
  const nativeMatches = Element.prototype.matches;
  Element.prototype.matches = function matches(this: Element, selector: string) {
    if (typeof selector === 'string' && selector.trim() === ':modal') return false;
    return nativeMatches.call(this, selector);
  };
}
