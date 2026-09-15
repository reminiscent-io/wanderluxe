import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import ShowcaseStage from './ShowcaseStage';
import tripJson from './tokyoTrip.json';

const reducedMotion = { current: false };
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => reducedMotion.current };
});

/**
 * The autoplay waits for the stage to be on screen. The global mock in
 * src/test/setup.ts keeps every observer inert, which other suites rely on, so
 * this suite stubs one whose callback it can fire by hand.
 */
let onIntersect: IntersectionObserverCallback | null = null;

class TriggerableIntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '';
  readonly thresholds: number[];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    onIntersect = callback;
    const threshold = options.threshold ?? 0;
    this.thresholds = Array.isArray(threshold) ? threshold : [threshold];
  }
}

beforeEach(() => {
  reducedMotion.current = false;
  onIntersect = null;
  vi.useRealTimers();
  vi.stubGlobal('IntersectionObserver', TriggerableIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const step = (name: RegExp) => screen.getByRole('tab', { name });

/** Scroll the stage onto the screen, as far as the given share of it. */
const bringOnScreen = (intersectionRatio = 0.4) =>
  act(() => {
    onIntersect?.(
      [{ isIntersecting: true, intersectionRatio } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  });

/**
 * The autoplay's state changes come from a timer, not an event, so React does
 * not flush them synchronously — without act() every autoplay assertion below
 * would read a stale DOM and pass whatever the component did. Matches the
 * fake-timer pattern in src/components/trip/map/usePlayback.test.ts.
 */
const waitOutTheAutoplay = () => act(() => void vi.advanceTimersByTime(8000));

describe('ShowcaseStage', () => {
  it('starts on the timeline step', () => {
    render(<ShowcaseStage />);
    expect(step(/your timeline/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('moves between steps on click', () => {
    render(<ShowcaseStage />);
    fireEvent.click(step(/studio edition/i));
    expect(step(/studio edition/i)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('group', { name: /sample editions/i })).toBeInTheDocument();
  });

  it('moves between steps with the arrow keys', () => {
    render(<ShowcaseStage />);
    fireEvent.keyDown(step(/your timeline/i), { key: 'ArrowRight' });
    expect(step(/simple pdf/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('carries focus with the selection, so repeated arrow presses keep moving', () => {
    // With a roving tabindex the tab just left drops out of the tab order. If
    // focus stayed on it, the second press would start from the same step and
    // select the one already showing.
    render(<ShowcaseStage />);
    act(() => step(/your timeline/i).focus());
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(step(/studio edition/i)).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(step(/studio edition/i));
  });

  it('keeps every itinerary item when the edition changes', () => {
    // The whole plan, in order, straight from the fixture. Comparing the full
    // ordered list is what makes a dropped or reordered item fail; counting one
    // title could not, since the AI's captions mention it too.
    const plan = tripJson.days.flatMap((d) => d.items.map((i) => i.title));
    const { container } = render(<ShowcaseStage />);
    const itemTitles = () =>
      Array.from(container.querySelectorAll('.pd-item-title'), (node) => node.textContent);

    fireEvent.click(step(/studio edition/i));
    expect(itemTitles()).toEqual(plan);

    const chips = within(screen.getByRole('group', { name: /sample editions/i })).getAllByRole('button');
    expect(chips).toHaveLength(3);
    for (const chip of chips) {
      fireEvent.click(chip);
      expect(chip).toHaveAttribute('aria-pressed', 'true');
      expect(itemTitles()).toEqual(plan);
    }
  });

  it('lets a visitor rewrite a line and put it back', () => {
    render(<ShowcaseStage />);
    fireEvent.click(step(/your words/i));

    const title = screen.getByLabelText(/cover title/i) as HTMLTextAreaElement;
    const original = title.value;
    fireEvent.change(title, { target: { value: 'Five Days, Mostly Walking' } });
    expect((screen.getByLabelText(/cover title/i) as HTMLTextAreaElement).value).toBe(
      'Five Days, Mostly Walking'
    );

    fireEvent.click(screen.getByRole('button', { name: /restore the original cover title/i }));
    expect((screen.getByLabelText(/cover title/i) as HTMLTextAreaElement).value).toBe(original);

    // Backspacing a line out to rewrite it is normal editing. An optional line
    // blanked this way has to keep its field and its way back, or it is gone
    // until reload.
    const tagline = screen.getByLabelText(/cover tagline/i) as HTMLTextAreaElement;
    const originalTagline = tagline.value;
    fireEvent.change(tagline, { target: { value: '' } });
    expect(screen.getByLabelText(/cover tagline/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /restore the original cover tagline/i }));
    expect((screen.getByLabelText(/cover tagline/i) as HTMLTextAreaElement).value).toBe(originalTagline);

    fireEvent.change(screen.getByLabelText(/day caption/i), { target: { value: '' } });
    expect(screen.getByLabelText(/day caption/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restore the original day caption/i })).toBeInTheDocument();
  });

  it('does not autoplay when the visitor asked for less motion', () => {
    reducedMotion.current = true;
    vi.useFakeTimers();
    render(<ShowcaseStage />);
    bringOnScreen();
    waitOutTheAutoplay();
    expect(step(/your timeline/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('does not autoplay before the stage is on screen', () => {
    // The stage mounts well before anyone can see it. A run that started then
    // would be over by the time a visitor scrolled to it.
    vi.useFakeTimers();
    render(<ShowcaseStage />);
    waitOutTheAutoplay();
    expect(step(/your timeline/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('waits until 40% of the stage is on screen', () => {
    // By the spec an observer reports isIntersecting as soon as its target
    // touches the screen, whatever the threshold, so the share is checked too.
    vi.useFakeTimers();
    render(<ShowcaseStage />);
    bringOnScreen(0.1);
    waitOutTheAutoplay();
    expect(step(/your timeline/i)).toHaveAttribute('aria-selected', 'true');

    bringOnScreen(0.4);
    waitOutTheAutoplay();
    expect(step(/studio edition/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('autoplays as far as the edition, then stops', () => {
    vi.useFakeTimers();
    render(<ShowcaseStage />);
    bringOnScreen();
    waitOutTheAutoplay();
    expect(step(/studio edition/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('stops autoplaying once the visitor takes over', () => {
    vi.useFakeTimers();
    render(<ShowcaseStage />);
    bringOnScreen();
    fireEvent.click(step(/print/i));
    waitOutTheAutoplay();
    expect(step(/print/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('stops autoplaying once a keyboard visitor reaches the steps', () => {
    // Tabbing onto the rail is an interaction. If a timer could still move the
    // selection, the focused tab would no longer be the selected one, and the
    // visitor's next arrow press would land on the step already showing.
    vi.useFakeTimers();
    render(<ShowcaseStage />);
    bringOnScreen();
    act(() => step(/your timeline/i).focus());
    waitOutTheAutoplay();
    expect(step(/your timeline/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the chosen step in view by scrolling the rail, never the page', () => {
    render(<ShowcaseStage />);
    const rail = screen.getByRole('tablist');
    // jsdom has no layout, so give the rail the overflow it has at phone width
    // and the chip an offset past the right edge.
    Object.defineProperty(rail, 'scrollWidth', { configurable: true, value: 721 });
    Object.defineProperty(rail, 'clientWidth', { configurable: true, value: 375 });
    Object.defineProperty(step(/studio edition/i), 'offsetLeft', { configurable: true, value: 300 });
    const railScroll = vi.fn();
    rail.scrollTo = railScroll as unknown as typeof rail.scrollTo;
    const pageScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const intoView = vi.fn();
    const originalIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = intoView;

    try {
      fireEvent.click(step(/studio edition/i));
      expect(railScroll).toHaveBeenCalledWith(expect.objectContaining({ left: 276 }));
      expect(pageScroll).not.toHaveBeenCalled();
      expect(intoView).not.toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = originalIntoView;
      pageScroll.mockRestore();
    }
  });
});
