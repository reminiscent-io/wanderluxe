import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Smoothly reveals streaming content character-by-character instead of in chunks.
 * Creates a fluid reveal effect that feels less choppy than batch flushing.
 *
 * The buffer accumulates the full content from SSE tokens, while displayedContent
 * gradually catches up at a steady per-frame rate — with dynamic acceleration
 * when the buffer grows faster than the reveal.
 *
 * @param charsPerFrame - Base number of characters to reveal per animation frame (default: 3)
 */
export function useBufferedStreaming(charsPerFrame = 3) {
  const [displayedContent, setDisplayedContent] = useState('');
  const bufferRef = useRef('');
  const displayedLengthRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);

  const tick = useCallback(() => {
    rafRef.current = null;

    const targetLength = bufferRef.current.length;
    const currentLength = displayedLengthRef.current;

    if (currentLength < targetLength) {
      // Dynamic speed: reveal faster when buffer is building up
      const gap = targetLength - currentLength;
      const advance = Math.max(charsPerFrame, Math.ceil(gap * 0.15));
      const newLength = Math.min(currentLength + advance, targetLength);

      displayedLengthRef.current = newLength;
      setDisplayedContent(bufferRef.current.substring(0, newLength));
    }

    // Keep the loop going while active
    if (isActiveRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [charsPerFrame]);

  /** Set the full buffer content (used when accumulator has the full string) */
  const setBufferContent = useCallback((content: string) => {
    bufferRef.current = content;
    if (!rafRef.current && isActiveRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  /** Append to buffer (alternative API) */
  const appendToBuffer = useCallback((content: string) => {
    bufferRef.current += content;
    if (!rafRef.current && isActiveRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  /** Start buffering (call when streaming begins) */
  const startBuffering = useCallback(() => {
    bufferRef.current = '';
    displayedLengthRef.current = 0;
    setDisplayedContent('');
    isActiveRef.current = true;
  }, []);

  /** Stop buffering and flush any remaining content immediately */
  const stopBuffering = useCallback(() => {
    isActiveRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (bufferRef.current) {
      displayedLengthRef.current = bufferRef.current.length;
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
    displayedLengthRef.current = 0;
    setDisplayedContent('');
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
