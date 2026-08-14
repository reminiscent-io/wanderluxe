import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePlayback, DWELL_MS, REDUCED_DWELL_MS } from './usePlayback';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Advance past one dwell, flushing the promise the step awaits. */
async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('usePlayback', () => {
  it('starts idle and does nothing until played', () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => usePlayback({ count: 3, onStep }));

    expect(result.current.status).toBe('idle');
    expect(result.current.index).toBe(0);
    expect(onStep).not.toHaveBeenCalled();
  });

  it('walks every stop in order and returns to idle at the end', async () => {
    const onStep = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => usePlayback({ count: 3, onStep, onComplete }));

    await act(async () => {
      result.current.play();
    });
    expect(onStep).toHaveBeenNthCalledWith(1, 0);

    await tick(DWELL_MS);
    expect(onStep).toHaveBeenNthCalledWith(2, 1);

    await tick(DWELL_MS);
    expect(onStep).toHaveBeenNthCalledWith(3, 2);

    // Last stop shown: playback ends rather than advancing to the next day.
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
    expect(onStep).toHaveBeenCalledTimes(3);
  });

  it('pause keeps the index so play resumes in place', async () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => usePlayback({ count: 4, onStep }));

    await act(async () => {
      result.current.play();
    });
    await tick(DWELL_MS);
    expect(result.current.index).toBe(1);

    act(() => {
      result.current.pause();
    });
    expect(result.current.status).toBe('paused');

    // No further steps fire while paused.
    await tick(DWELL_MS * 3);
    expect(onStep).toHaveBeenCalledTimes(2);

    await act(async () => {
      result.current.play();
    });
    expect(onStep).toHaveBeenLastCalledWith(1);
  });

  it('stop resets to the beginning', async () => {
    const { result } = renderHook(() => usePlayback({ count: 3, onStep: vi.fn() }));

    await act(async () => {
      result.current.play();
    });
    await tick(DWELL_MS);

    act(() => {
      result.current.stop();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.index).toBe(0);
  });

  it('manual stepping pauses rather than leaving playback running', async () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => usePlayback({ count: 3, onStep }));

    await act(async () => {
      result.current.play();
    });
    act(() => {
      result.current.stepBy(1);
    });

    expect(result.current.status).toBe('paused');
    expect(result.current.index).toBe(1);
    expect(onStep).toHaveBeenLastCalledWith(1);

    await tick(DWELL_MS * 2);
    expect(result.current.index).toBe(1);
  });

  it('clamps stepping at both ends', async () => {
    const { result } = renderHook(() => usePlayback({ count: 2, onStep: vi.fn() }));

    act(() => {
      result.current.stepBy(-1);
    });
    expect(result.current.index).toBe(0);

    act(() => {
      result.current.stepBy(5);
    });
    expect(result.current.index).toBe(1);
  });

  it('toggle flips between playing and paused', async () => {
    const { result } = renderHook(() => usePlayback({ count: 3, onStep: vi.fn() }));

    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.status).toBe('paused');
  });

  it('speed scales the dwell', async () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => usePlayback({ count: 3, onStep, speed: 2 }));

    await act(async () => {
      result.current.play();
    });
    await tick(DWELL_MS / 2);
    expect(onStep).toHaveBeenCalledTimes(2);
  });

  it('reduced motion dwells longer so the cut stays comprehensible', async () => {
    const onStep = vi.fn();
    const { result } = renderHook(() =>
      usePlayback({ count: 3, onStep, reducedMotion: true }),
    );

    await act(async () => {
      result.current.play();
    });
    await tick(DWELL_MS);
    // Still on the first stop: the reduced dwell is longer than the normal one.
    expect(onStep).toHaveBeenCalledTimes(1);

    await tick(REDUCED_DWELL_MS - DWELL_MS);
    expect(onStep).toHaveBeenCalledTimes(2);
  });

  it('resets when the stop count changes, e.g. on a day change', async () => {
    const onStep = vi.fn();
    const { result, rerender } = renderHook(
      ({ count }) => usePlayback({ count, onStep }),
      { initialProps: { count: 4 } },
    );

    await act(async () => {
      result.current.play();
    });
    await tick(DWELL_MS);
    expect(result.current.index).toBe(1);

    rerender({ count: 2 });
    expect(result.current.status).toBe('idle');
    expect(result.current.index).toBe(0);

    const before = onStep.mock.calls.length;
    await tick(DWELL_MS * 3);
    expect(onStep).toHaveBeenCalledTimes(before);
  });

  it('does nothing with no stops', async () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => usePlayback({ count: 0, onStep }));

    await act(async () => {
      result.current.play();
    });
    await tick(DWELL_MS * 2);
    expect(onStep).not.toHaveBeenCalled();
  });
});
