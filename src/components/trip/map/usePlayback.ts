import { useCallback, useEffect, useRef, useState } from 'react';

export type PlaybackStatus = 'idle' | 'playing' | 'paused';

export interface PlaybackState {
  status: PlaybackStatus;
  index: number;
}

export const CAMERA_MS = 900;
export const DWELL_MS = 1400;
/** Reduced motion cuts instead of easing, so the dwell carries comprehension. */
export const REDUCED_DWELL_MS = 2200;

export interface UsePlaybackOptions {
  /** Number of stops to step through. */
  count: number;
  /** Move the camera to `index`; resolves when it arrives. */
  onStep: (index: number) => Promise<void> | void;
  /** Called once the last stop has been shown. */
  onComplete?: () => void;
  speed?: number;
  reducedMotion?: boolean;
}

/**
 * Drives a stop-to-stop tour of one day.
 *
 * Interrupts *pause* rather than stop, keeping `index` so Play resumes in place.
 * Playback never auto-advances to the next day: that surprises people and
 * fights the "pick a day" mental model.
 */
export function usePlayback({
  count,
  onStep,
  onComplete,
  speed = 1,
  reducedMotion = false,
}: UsePlaybackOptions) {
  const [state, setState] = useState<PlaybackState>({ status: 'idle', index: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);

  /*
   * State is mirrored in a ref so callbacks can read the latest value without
   * running side effects inside a setState updater. React requires updaters to
   * be pure and double-invokes them under StrictMode, which would otherwise
   * start the tour twice.
   */
  const stateRef = useRef(state);
  const commit = useCallback((next: PlaybackState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const stepRef = useRef(onStep);
  const completeRef = useRef(onComplete);
  useEffect(() => {
    stepRef.current = onStep;
    completeRef.current = onComplete;
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Invalidates any in-flight step so a late resolve cannot resurrect playback. */
  const halt = useCallback(() => {
    runIdRef.current += 1;
    clearTimer();
  }, [clearTimer]);

  useEffect(() => halt, [halt]);

  const pause = useCallback(() => {
    halt();
    if (stateRef.current.status === 'playing') {
      commit({ ...stateRef.current, status: 'paused' });
    }
  }, [halt, commit]);

  const stop = useCallback(() => {
    halt();
    commit({ status: 'idle', index: 0 });
  }, [halt, commit]);

  const runFrom = useCallback(
    (start: number) => {
      if (count === 0) return;
      halt();
      const runId = runIdRef.current;
      const dwell = (reducedMotion ? REDUCED_DWELL_MS : DWELL_MS) / speed;

      const advance = async (index: number) => {
        if (runId !== runIdRef.current) return;
        commit({ status: 'playing', index });

        await stepRef.current(index);
        if (runId !== runIdRef.current) return;

        if (index >= count - 1) {
          commit({ status: 'idle', index: 0 });
          completeRef.current?.();
          return;
        }

        timerRef.current = setTimeout(() => {
          if (runId === runIdRef.current) void advance(index + 1);
        }, dwell);
      };

      void advance(start);
    },
    [count, halt, reducedMotion, speed, commit],
  );

  const play = useCallback(() => {
    const start = stateRef.current.status === 'paused' ? stateRef.current.index : 0;
    commit({ status: 'playing', index: start });
    runFrom(start);
  }, [runFrom, commit]);

  const toggle = useCallback(() => {
    if (state.status === 'playing') pause();
    else play();
  }, [state.status, pause, play]);

  /** Manual stepping always leaves playback paused, never running. */
  const stepBy = useCallback(
    (delta: number) => {
      halt();
      const next = Math.min(count - 1, Math.max(0, stateRef.current.index + delta));
      commit({ status: 'paused', index: next });
      void stepRef.current(next);
    },
    [count, halt, commit],
  );

  // Changing day (or losing the stops) resets rather than replaying a stale index.
  useEffect(() => {
    halt();
    commit({ status: 'idle', index: 0 });
  }, [count, halt, commit]);

  return {
    status: state.status,
    index: state.index,
    isPlaying: state.status === 'playing',
    play,
    pause,
    stop,
    toggle,
    stepBy,
  };
}

/**
 * Live `prefers-reduced-motion`, so toggling the OS setting mid-session takes
 * effect without a reload.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return reduced;
}
