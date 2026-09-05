import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TimelineView from './TimelineView';

vi.mock('@/hooks/use-timeline-events', () => ({
  useTimelineEvents: () => ({ events: [], refreshEvents: vi.fn() }),
}));
vi.mock('@/hooks/use-trip-days', () => ({
  useTripDays: () => ({ days: [], refreshDays: vi.fn() }),
}));
vi.mock('@/hooks/use-transportation-events', () => ({
  useTransportationEvents: () => ({ transportationData: [], refreshTransportation: vi.fn() }),
}));
vi.mock('@/hooks/useSessionKeepAlive', () => ({ useSessionKeepAlive: vi.fn() }));
vi.mock('@/hooks/useWeather', () => ({ useWeather: () => ({ data: undefined }) }));
vi.mock('@/utils/googleMapsLoader', () => ({ loadGoogleMapsAPI: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('./timeline/TimelineContent', () => ({
  default: () => <div data-testid="timeline-content" />,
}));
vi.mock('./timeline/ViewingStatusAvatars', () => ({ default: () => null }));
vi.mock('@/hooks/useTravelers', () => ({
  useTravelers: () => ({ travelers: [], isLoading: false }),
}));
// Hints default to already-seen here so the dock/view assertions below aren't
// perturbed by an extra banner. Hint behaviour is covered by DiscoverHint.test.tsx.
vi.mock('@/hooks/useFirstRun', () => ({
  useFirstRun: () => ({ isUnseen: false, dismiss: vi.fn() }),
  default: () => ({ isUnseen: false, dismiss: vi.fn() }),
}));
vi.mock('./ExportPdfButton', () => ({ default: () => null }));
vi.mock('./print-studio/PrintStudioDialog', () => ({ default: (): null => null }));
vi.mock('./calendar/CalendarSyncSheet', () => ({ default: () => null }));
vi.mock('./calendar/TripCalendarView', () => ({
  default: () => <div data-testid="calendar-view" />,
}));
vi.mock('./map/TripMapView', () => ({
  default: () => <div data-testid="map-view" />,
}));
// Stub the panel via the barrel; the real AssistantDock (direct import) stays under test.
vi.mock('./ai-assistant', () => ({
  AIAssistantPanel: ({ onCollapse }: { onCollapse?: () => void }) => (
    <button type="button" onClick={onCollapse}>stub-collapse</button>
  ),
}));

const tripDates = { arrival_date: '2026-08-01', departure_date: '2026-08-07' };

const renderView = (initialEntry = '/trip/trip-1/timeline') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <TimelineView tripId="trip-1" tripDates={tripDates} tripDestination="Kyoto" canEdit />
    </MemoryRouter>,
  );

describe('TimelineView assistant dock', () => {
  beforeEach(() => {
    (window as { gtag?: unknown }).gtag = vi.fn();
  });
  afterEach(() => {
    delete (window as { gtag?: unknown }).gtag;
  });

  it('defaults to open: docked column next to a 58% timeline, no floating button', () => {
    renderView();
    expect(screen.getByTestId('itinerary-column').className).toContain('lg:w-[58%]');
    expect(screen.getByTestId('assistant-dock').className).toContain('lg:w-[42%]');
    expect(screen.queryByRole('button', { name: /open trip assistant/i })).not.toBeInTheDocument();
  });

  it('collapse folds the assistant into a floating button and the timeline goes full width', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'stub-collapse' }));
    expect(screen.getByTestId('itinerary-column').className).toContain('lg:w-full');
    expect(screen.getByTestId('itinerary-column').className).not.toContain('lg:w-[58%]');
    expect(screen.getByTestId('assistant-dock').className).toBe('hidden');
    expect(screen.getByRole('button', { name: /open trip assistant/i })).toBeInTheDocument();
  });

  it('the floating button restores the docked panel', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'stub-collapse' }));
    fireEvent.click(screen.getByRole('button', { name: /open trip assistant/i }));
    expect(screen.getByTestId('itinerary-column').className).toContain('lg:w-[58%]');
    expect(screen.getByTestId('assistant-dock').className).toContain('lg:w-[42%]');
  });

  it('calendar view is always full width with the assistant as a fixed overlay', async () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));
    expect(await screen.findByTestId('calendar-view')).toBeInTheDocument();
    expect(screen.getByTestId('itinerary-column').className).toContain('lg:w-full');
    const dock = screen.getByTestId('assistant-dock');
    expect(dock.className).toContain('fixed');
    expect(dock.className).toContain('z-40');
  });

  it('open state carries across view switches (open in calendar after collapsing + reopening in timeline)', async () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'stub-collapse' }));
    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));
    await screen.findByTestId('calendar-view');
    // still collapsed after the switch
    expect(screen.getByTestId('assistant-dock').className).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: /open trip assistant/i }));
    expect(screen.getByTestId('assistant-dock').className).toContain('fixed');
  });

  it('map view is full width with the assistant as a fixed overlay', async () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    expect(await screen.findByTestId('map-view')).toBeInTheDocument();
    expect(screen.getByTestId('itinerary-column').className).toContain('lg:w-full');
    const dock = screen.getByTestId('assistant-dock');
    expect(dock.className).toContain('fixed');
    expect(dock.className).toContain('z-40');
  });
});

describe('TimelineView itinerary view switching', () => {
  beforeEach(() => {
    (window as { gtag?: unknown }).gtag = vi.fn();
  });
  afterEach(() => {
    delete (window as { gtag?: unknown }).gtag;
  });

  it('opens the view named by ?view=, so the map is deep-linkable', async () => {
    renderView('/trip/trip-1/timeline?view=map');
    expect(await screen.findByTestId('map-view')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to the timeline for an unknown view', () => {
    renderView('/trip/trip-1/timeline?view=nonsense');
    expect(screen.getByTestId('timeline-content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Timeline' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the map mounted but hidden after switching away, so it is not re-instantiated', async () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    await screen.findByTestId('map-view');

    fireEvent.click(screen.getByRole('button', { name: 'Timeline' }));
    expect(screen.getByTestId('timeline-content')).toBeInTheDocument();
    // Still in the DOM — Dynamic Maps bills per map instantiation.
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    expect(screen.getByTestId('map-view-host').className).toContain('hidden');
  });

  it('does not mount the map until it is first opened', () => {
    renderView();
    expect(screen.queryByTestId('map-view-host')).not.toBeInTheDocument();
  });
});
