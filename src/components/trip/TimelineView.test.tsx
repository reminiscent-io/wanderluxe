import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
vi.mock('./ExportPdfButton', () => ({ default: () => null }));
vi.mock('./calendar/CalendarSyncSheet', () => ({ default: () => null }));
vi.mock('./calendar/TripCalendarView', () => ({
  default: () => <div data-testid="calendar-view" />,
}));
// Stub the panel via the barrel; the real AssistantDock (direct import) stays under test.
vi.mock('./ai-assistant', () => ({
  AIAssistantPanel: ({ onCollapse }: { onCollapse?: () => void }) => (
    <button type="button" onClick={onCollapse}>stub-collapse</button>
  ),
}));

const tripDates = { arrival_date: '2026-08-01', departure_date: '2026-08-07' };

const renderView = () =>
  render(<TimelineView tripId="trip-1" tripDates={tripDates} tripDestination="Kyoto" canEdit />);

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
});
