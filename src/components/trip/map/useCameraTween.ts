import { useCallback, useEffect, useRef } from 'react';
import type { LatLng } from './stopModel';

export interface CameraTarget {
  center: LatLng;
  zoom?: number;
}

/** Matches the design system's exponential ease-out: decisive, no bounce. */
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export interface UseCameraTweenOptions {
  map: google.maps.Map | null;
  /** Skip interpolation and cut straight to the target. */
  reducedMotion?: boolean;
  /** Fires when the user grabs the camera mid-tween. */
  onUserInterrupt?: () => void;
}

/**
 * Smooth programmatic camera moves.
 *
 * `panTo` eases but is not configurable and `moveCamera` is instant, so real
 * control means interpolating per frame. The `isTweening` flag lets the caller
 * tell our own camera changes apart from the user's — without it, every frame we
 * drive would look like a gesture and instantly pause playback.
 */
export function useCameraTween({ map, reducedMotion = false, onUserInterrupt }: UseCameraTweenOptions) {
  const frameRef = useRef<number | null>(null);
  const tweeningRef = useRef(false);

  const cancel = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    tweeningRef.current = false;
  }, []);

  useEffect(() => cancel, [cancel]);

  // A drag or zoom that we did not initiate is the user taking over.
  useEffect(() => {
    if (!map || !onUserInterrupt) return;
    const handler = () => {
      if (!tweeningRef.current) onUserInterrupt();
    };
    const listeners = [
      map.addListener('dragstart', handler),
      map.addListener('click', handler),
    ];
    return () => listeners.forEach((l) => l.remove());
  }, [map, onUserInterrupt]);

  const tweenTo = useCallback(
    (target: CameraTarget, durationMs: number): Promise<void> => {
      if (!map) return Promise.resolve();
      cancel();

      const startCenter = map.getCenter();
      const startZoom = map.getZoom();

      if (reducedMotion || !startCenter || startZoom == null || durationMs <= 0) {
        tweeningRef.current = true;
        map.moveCamera({ center: target.center, zoom: target.zoom ?? startZoom ?? undefined });
        tweeningRef.current = false;
        return Promise.resolve();
      }

      const from = { lat: startCenter.lat(), lng: startCenter.lng(), zoom: startZoom };
      const toZoom = target.zoom ?? startZoom;

      // Interpolate the short way around the globe.
      let dLng = target.center.lng - from.lng;
      if (dLng > 180) dLng -= 360;
      if (dLng < -180) dLng += 360;

      return new Promise<void>((resolve) => {
        const started = performance.now();
        tweeningRef.current = true;

        const frame = (now: number) => {
          const t = Math.min(1, (now - started) / durationMs);
          const e = easeOutCubic(t);

          map.moveCamera({
            center: {
              lat: from.lat + (target.center.lat - from.lat) * e,
              lng: from.lng + dLng * e,
            },
            zoom: from.zoom + (toZoom - from.zoom) * e,
          });

          if (t < 1) {
            frameRef.current = requestAnimationFrame(frame);
          } else {
            frameRef.current = null;
            tweeningRef.current = false;
            resolve();
          }
        };

        frameRef.current = requestAnimationFrame(frame);
      });
    },
    [map, reducedMotion, cancel],
  );

  return { tweenTo, cancel, isTweening: () => tweeningRef.current };
}
