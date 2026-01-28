import { useState, useEffect, useCallback, useRef } from 'react';

interface VisualViewportState {
  /** Height of the visual viewport (viewport minus keyboard) */
  height: number;
  /** Width of the visual viewport */
  width: number;
  /** Offset from top of layout viewport to top of visual viewport */
  offsetTop: number;
  /** Offset from left of layout viewport to left of visual viewport */
  offsetLeft: number;
  /** Estimated keyboard height based on viewport difference */
  keyboardHeight: number;
  /** Whether the keyboard is likely open */
  isKeyboardOpen: boolean;
  /** Scale of the visual viewport */
  scale: number;
}

/**
 * Hook to track the visual viewport, which accounts for on-screen keyboards,
 * pinch-zoom, and browser chrome on mobile devices.
 *
 * Best practice for PWA/mobile chat input handling:
 * - Visual viewport height shrinks when keyboard opens
 * - Layout viewport stays the same (100vh doesn't change)
 * - Use visual viewport to determine actual available space
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 0;

    return {
      height: vv?.height ?? windowHeight,
      width: vv?.width ?? windowWidth,
      offsetTop: vv?.offsetTop ?? 0,
      offsetLeft: vv?.offsetLeft ?? 0,
      keyboardHeight: 0,
      isKeyboardOpen: false,
      scale: vv?.scale ?? 1,
    };
  });

  // Store initial viewport height to detect keyboard
  const initialHeightRef = useRef<number>(0);

  const updateViewport = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    // Initialize reference height on first call
    if (initialHeightRef.current === 0) {
      initialHeightRef.current = vv.height;
    }

    // Calculate keyboard height based on difference from initial height
    // Only consider keyboard open if height reduction is significant (> 100px)
    const heightDiff = initialHeightRef.current - vv.height;
    const keyboardHeight = heightDiff > 100 ? heightDiff : 0;
    const isKeyboardOpen = keyboardHeight > 0;

    setState({
      height: vv.height,
      width: vv.width,
      offsetTop: vv.offsetTop,
      offsetLeft: vv.offsetLeft,
      keyboardHeight,
      isKeyboardOpen,
      scale: vv.scale,
    });
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;

    if (!vv) {
      // Fallback for browsers without Visual Viewport API
      const handleResize = () => {
        setState(prev => ({
          ...prev,
          height: window.innerHeight,
          width: window.innerWidth,
        }));
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    // Update on resize (keyboard open/close)
    vv.addEventListener('resize', updateViewport);
    // Update on scroll (keyboard panning)
    vv.addEventListener('scroll', updateViewport);

    // Initial update
    updateViewport();

    return () => {
      vv.removeEventListener('resize', updateViewport);
      vv.removeEventListener('scroll', updateViewport);
    };
  }, [updateViewport]);

  // Reset initial height when orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      // Reset on next frame after orientation change
      requestAnimationFrame(() => {
        initialHeightRef.current = 0;
        updateViewport();
      });
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, [updateViewport]);

  return state;
}

export default useVisualViewport;
