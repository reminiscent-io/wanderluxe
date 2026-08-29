import React from 'react';
import { vi } from 'vitest';

/**
 * Stub for `@vis.gl/react-google-maps`.
 *
 * We stub the library rather than the Google API: the real library needs a live
 * network and an API key, so mocking it lets tests exercise *our* composition
 * without testing Google's. This is the inverse of TripCalendarView.test.tsx,
 * which mocks the data hooks and renders the real FullCalendar.
 *
 * Import from a test file (`vi.mock('@vis.gl/react-google-maps', () => visglMock())`)
 * rather than from src/test/setup.ts, so a fake `window.google` never leaks into
 * suites that do not want one.
 */
export function visglMock() {
  const map = {
    getCenter: () => ({ lat: () => 0, lng: () => 0 }),
    getZoom: () => 12,
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    moveCamera: vi.fn(),
    fitBounds: vi.fn(),
    panTo: vi.fn(),
    addListener: vi.fn(() => ({ remove: vi.fn() })),
  };

  return {
    APIProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Map: ({ children, ...rest }: { children?: React.ReactNode; mapTypeId?: string }) => (
      <div data-testid="google-map" data-map-type={rest.mapTypeId}>
        {children}
      </div>
    ),
    AdvancedMarker: ({
      children,
      position,
      onClick,
    }: {
      children?: React.ReactNode;
      position?: { lat: number; lng: number };
      onClick?: () => void;
    }) => (
      <div
        data-testid="advanced-marker"
        data-lat={position?.lat}
        data-lng={position?.lng}
        onClick={onClick}
      >
        {children}
      </div>
    ),
    InfoWindow: ({ children }: { children?: React.ReactNode }) => (
      <div role="dialog" data-testid="info-window">
        {children}
      </div>
    ),
    Polyline: ({ geodesic, strokeColor, path }: { geodesic?: boolean; strokeColor?: string; path?: unknown[] }) => (
      <div
        data-testid="polyline"
        data-geodesic={String(!!geodesic)}
        data-stroke={strokeColor}
        data-points={path?.length ?? 0}
      />
    ),
    Pin: (): null => null,
    useMap: (): typeof map => map,
    useMapsLibrary: (): null => null,
    __map: map,
  };
}
