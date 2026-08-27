import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ActivityForm from './ActivityForm';
import ActivityDialog from './day/activities/ActivityDialog';
import type { ActivityFormData } from '@/types/trip';

vi.mock('@/integrations/supabase/client', () => {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.order = () => Promise.resolve({ data: [], error: null });
  chain.single = () => Promise.resolve({ data: { day_id: 'day-1' }, error: null });
  chain.update = () => chain;
  return { supabase: { from: () => chain } };
});

vi.mock('@/services/travelers', () => ({
  getJunctionTravelerIds: () => Promise.resolve({ data: [] }),
  setJunctionTravelers: () => Promise.resolve(),
}));

vi.mock('@/hooks/useTripTimezone', () => ({ useTripTimezone: () => ({ tripTimezone: null }) }));
vi.mock('@/hooks/useResolveTimezone', () => ({ useResolveTimezone: () => ({ timeZoneId: null }) }));

vi.mock('./accommodation/GooglePlacesAutocomplete', () => ({ default: () => null }));
vi.mock('./travelers/TravelersTagMultiSelect', () => ({ default: () => null }));
vi.mock('./_shared/TimezoneSelect', () => ({ default: () => null }));
vi.mock('./dining/form/RestaurantContactInfo', () => ({ default: () => null }));

const TRIP_DATES = { arrival_date: '2026-07-01', departure_date: '2026-07-05' };

/** A saved 1h activity: its duration matches the "1h" preset, so the form opens in preset mode. */
const savedActivity: ActivityFormData = {
  title: 'Louvre tour',
  description: '',
  date: '2026-07-01',
  start_time: '08:00',
  end_time: '09:00',
  cost: '',
  currency: 'USD',
};

/** Mirrors how TimelineContent owns the form data and feeds it straight back down. */
const Harness: React.FC<{
  initial: ActivityFormData;
  onState: (a: ActivityFormData) => void;
  activityId?: string | null;
}> = ({ initial, onState, activityId = 'act-1' }) => {
  const [activity, setActivity] = React.useState<ActivityFormData>(initial);
  React.useEffect(() => {
    onState(activity);
  }, [activity, onState]);
  return (
    <ActivityForm
      activity={activity}
      onActivityChange={setActivity}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
      submitLabel="Save"
      eventId="day-1"
      tripDates={TRIP_DATES}
      tripId="trip-1"
      activityId={activityId}
    />
  );
};

function renderForm(initial: ActivityFormData, activityId: string | null = 'act-1') {
  const state = { current: initial };
  const onState = (a: ActivityFormData) => {
    state.current = a;
  };
  render(<Harness initial={initial} onState={onState} activityId={activityId} />);
  return {
    state,
    start: () => screen.getByLabelText('Start') as HTMLInputElement,
    end: () => screen.getByLabelText('End') as HTMLInputElement,
  };
}

describe('ActivityForm times', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps a new start time while a duration preset is active', async () => {
    const { state, start } = renderForm(savedActivity);

    fireEvent.change(start(), { target: { value: '10:00' } });

    await waitFor(() => expect(state.current.start_time).toBe('10:00'));
    // The preset rides along instead of overwriting the start with the old value.
    expect(state.current.end_time).toBe('11:00');
    expect(start().value).toBe('10:00');
  });

  it('does not revert the start time on a later render', async () => {
    const { state, start } = renderForm(savedActivity);

    fireEvent.change(start(), { target: { value: '13:30' } });
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Louvre tour, late' } });

    await waitFor(() => expect(state.current.title).toBe('Louvre tour, late'));
    expect(state.current.start_time).toBe('13:30');
    expect(start().value).toBe('13:30');
  });

  it('writes both times when a preset is picked with no start set', async () => {
    const { state } = renderForm({ ...savedActivity, start_time: '', end_time: '' }, null);

    fireEvent.click(screen.getByRole('button', { name: '2h' }));

    await waitFor(() => expect(state.current.start_time).toBe('08:00'));
    expect(state.current.end_time).toBe('10:00');
  });

  it('leaves a custom end time alone when the start moves', async () => {
    const { state, start, end } = renderForm(savedActivity);

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    fireEvent.change(end(), { target: { value: '17:45' } });
    fireEvent.change(start(), { target: { value: '11:15' } });

    await waitFor(() => expect(state.current.start_time).toBe('11:15'));
    expect(state.current.end_time).toBe('17:45');
  });

  it('renders a stored HH:MM:SS time in the HH:MM input', () => {
    const { start, state } = renderForm({ ...savedActivity, start_time: '08:00:00', end_time: '09:00:00' });

    expect(start().value).toBe('08:00');
    // Untouched values are passed through as they came in.
    expect(state.current.start_time).toBe('08:00:00');
  });
});

describe('ActivityDialog initialData seeding', () => {
  beforeEach(() => vi.clearAllMocks());

  /** TripCalendarView and TripMapView both build initialData inline, so a fresh
   *  object arrives on every parent render. */
  const DialogHarness: React.FC = () => {
    const [, force] = React.useState(0);
    const qc = React.useMemo(() => new QueryClient(), []);
    return (
      <QueryClientProvider client={qc}>
        <button type="button" data-testid="force" onClick={() => force((n) => n + 1)}>
          re-render
        </button>
        <ActivityDialog
          open
          onOpenChange={vi.fn()}
          tripId="trip-1"
          activityId="act-1"
          initialData={{ ...savedActivity } as never}
          tripDates={TRIP_DATES}
          onSuccess={vi.fn()}
        />
      </QueryClientProvider>
    );
  };

  it('does not wipe an in-progress edit when the parent re-renders', async () => {
    render(<DialogHarness />);

    const start = () => screen.getByLabelText('Start') as HTMLInputElement;
    await waitFor(() => expect(start().value).toBe('08:00'));

    fireEvent.change(start(), { target: { value: '15:00' } });
    await waitFor(() => expect(start().value).toBe('15:00'));

    fireEvent.click(screen.getByTestId('force'));

    await waitFor(() => expect(start().value).toBe('15:00'));
  });
});
