import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import ShowcaseStage from './ShowcaseStage';

const reducedMotion = { current: false };
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => reducedMotion.current };
});

beforeEach(() => {
  reducedMotion.current = false;
  vi.useRealTimers();
});

const step = (name: RegExp) => screen.getByRole('tab', { name });

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

  it('keeps every itinerary item when the edition changes', () => {
    render(<ShowcaseStage />);
    fireEvent.click(step(/studio edition/i));
    const itemsBefore = screen.getAllByText(/teamLab Planets/i).length;

    const chips = within(screen.getByRole('group', { name: /sample editions/i })).getAllByRole('button');
    fireEvent.click(chips[1]);

    expect(screen.getAllByText(/teamLab Planets/i)).toHaveLength(itemsBefore);
    expect(chips[1]).toHaveAttribute('aria-pressed', 'true');
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
  });

  it('does not autoplay when the visitor asked for less motion', () => {
    reducedMotion.current = true;
    vi.useFakeTimers();
    render(<ShowcaseStage />);
    waitOutTheAutoplay();
    expect(step(/your timeline/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('autoplays as far as the edition, then stops', () => {
    vi.useFakeTimers();
    render(<ShowcaseStage />);
    waitOutTheAutoplay();
    expect(step(/studio edition/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('stops autoplaying once the visitor takes over', () => {
    vi.useFakeTimers();
    render(<ShowcaseStage />);
    fireEvent.click(step(/print/i));
    waitOutTheAutoplay();
    expect(step(/print/i)).toHaveAttribute('aria-selected', 'true');
  });
});
