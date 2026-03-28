import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Buffers incoming streaming content and flushes to state at a controlled rate.
 * This prevents jarring rapid text rendering by batching SSE token updates.
 *
 * @param flushIntervalMs - How often to flush buffered content to state (default: 30ms)
 */
export function useBufferedStreaming(flushIntervalMs = 30) {
  const [displayedContent, setDisplayedContent] = useState('');
  const bufferRef = useRef('');
  const rafRef = useRef<number | null>(null);
  const lastFlushRef = useRef(0);
  const isActiveRef = useRef(false);

  const flush = useCallback(() => {
    rafRef.current = null;
    if (bufferRef.current) {
      setDisplayedContent(bufferRef.current);
      lastFlushRef.current = performance.now();
    }

    // Schedule next flush if still active and buffer may grow
    if (isActiveRef.current) {
      rafRef.current = requestAnimationFrame(scheduleFlush);
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    const now = performance.now();
    const elapsed = now - lastFlushRef.current;
    if (elapsed >= flushIntervalMs) {
      flush();
    } else {
      // Wait until interval has elapsed
      rafRef.current = requestAnimationFrame(scheduleFlush);
    }
  }, [flushIntervalMs, flush]);

  /** Call this from SSE onmessage to append new content to the buffer */
  const appendToBuffer = useCallback((content: string) => {
    bufferRef.current += content;

    // Start the flush loop if not already running
    if (!rafRef.current && isActiveRef.current) {
      rafRef.current = requestAnimationFrame(scheduleFlush);
    }
  }, [scheduleFlush]);

  /** Set the full buffer content (used when accumulator has the full string) */
  const setBufferContent = useCallback((content: string) => {
    bufferRef.current = content;

    if (!rafRef.current && isActiveRef.current) {
      rafRef.current = requestAnimationFrame(scheduleFlush);
    }
  }, [scheduleFlush]);

  /** Start buffering (call when streaming begins) */
  const startBuffering = useCallback(() => {
    bufferRef.current = '';
    setDisplayedContent('');
    lastFlushRef.current = 0;
    isActiveRef.current = true;
  }, []);

  /** Stop buffering and flush any remaining content immediately */
  const stopBuffering = useCallback(() => {
    isActiveRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Final flush of any remaining buffered content
    if (bufferRef.current) {
      setDisplayedContent(bufferRef.current);
    }
    bufferRef.current = '';
  }, []);

  /** Reset everything (call when streaming ends and message is committed) */
  const reset = useCallback(() => {
    isActiveRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    bufferRef.current = '';
    setDisplayedContent('');
    lastFlushRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    displayedContent,
    appendToBuffer,
    setBufferContent,
    startBuffering,
    stopBuffering,
    reset
  };
}
