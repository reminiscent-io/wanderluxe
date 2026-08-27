import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RestaurantReservationForm from './RestaurantReservationForm';
import { reservationFormSchema } from './reservationFormSchema';

// A trip_days lookup runs on submit; keep the chain permissive so both the
// one-eq and two-eq call sites resolve.
vi.mock('@/integrations/supabase/client', () => {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.single = () => Promise.resolve({ data: { day_id: 'day-1', date: '2026-07-01' }, error: null });
  return { supabase: { from: () => chain } };
});

vi.mock('@/utils/googleMapsLoader', () => ({
  loadGoogleMapsAPI: () => Promise.resolve(),
  getPlaceDetails: () => Promise.resolve(null),
  getPhotoUrl: () => null,
}));

vi.mock('@/services/travelers', () => ({
  getJunctionTravelerIds: () => Promise.resolve({ data: [] }),
  setJunctionTravelers: () => Promise.resolve(),
}));

vi.mock('@/hooks/useTripTimezone', () => ({ useTripTimezone: () => ({ tripTimezone: null }) }));
vi.mock('@/hooks/useResolveTimezone', () => ({ useResolveTimezone: () => ({ timeZoneId: null }) }));

vi.mock('./RestaurantSearchInput', () => ({
  default: ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => (
    <input aria-label="Restaurant Name" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock('../travelers/TravelersTagMultiSelect', () => ({ default: () => null }));
vi.mock('../budget/CurrencySelector', () => ({ default: () => null }));
vi.mock('../_shared/TimezoneSelect', () => ({ default: () => null }));

/** Mirrors a saved row: Postgres stores NULL for anything left blank. */
const savedReservation = {
  id: 'res-1',
  trip_id: 'trip-1',
  day_id: 'day-1',
  order_index: 0,
  restaurant_name: 'Septime',
  reservation_time: '19:30:00',
  notes: null,
  address: null,
  phone_number: null,
  website: null,
  place_id: null,
  currency: null,
  cost: null,
  number_of_people: null,
  rating: null,
  timezone: null,
};

const renderForm = (
  onSubmit: ReturnType<typeof vi.fn>,
  defaultValues: Record<string, unknown> = savedReservation,
) =>
  render(
    <RestaurantReservationForm
      onSubmit={onSubmit}
      defaultValues={defaultValues}
      tripId="trip-1"
      tripArrivalDate="2026-07-01"
      tripDepartureDate="2026-07-05"
    />,
  );

describe('RestaurantReservationForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves a reservation whose notes are empty', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ restaurant_name: 'Septime', notes: '' });
  });

  it('keeps notes the user typed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit);

    await userEvent.type(screen.getByLabelText('Notes'), 'Window table');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ notes: 'Window table' });
  });

  it('defaults the end time to 90 minutes after the start', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit);

    await waitFor(() => expect(screen.getByLabelText('End Time')).toHaveValue('21:00'));

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ end_time: '21:00' });
  });

  it('never rewrites an end time already on the record', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit, { ...savedReservation, end_time: '23:00:00' });

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ end_time: '23:00:00' });
  });

  it('follows the start time until the user picks an end of their own', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit);

    // The required marker is part of the accessible name.
    const start = screen.getByLabelText(/Start Time/);
    const end = screen.getByLabelText('End Time');
    await waitFor(() => expect(end).toHaveValue('21:00'));

    // Moving the start drags the untouched default along...
    fireEvent.change(start, { target: { value: '12:00' } });
    await waitFor(() => expect(end).toHaveValue('13:30'));

    // ...but once the user sets an end themselves it stops following.
    fireEvent.change(end, { target: { value: '15:45' } });
    fireEvent.change(start, { target: { value: '18:00' } });
    await waitFor(() => expect(start).toHaveValue('18:00'));
    expect(end).toHaveValue('15:45');
  });

  it('reads the span back as a duration, and drops it when there is none', async () => {
    renderForm(vi.fn());

    // 19:30 + the 90-minute default.
    expect(await screen.findByText('1h 30m')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '20:15' } });
    await waitFor(() => expect(screen.getByText('45m')).toBeInTheDocument());

    // An end that isn't after its start describes no span at all.
    fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '19:00' } });
    await waitFor(() => expect(screen.queryByText(/^\d+h|^\d+m/)).not.toBeInTheDocument());
  });

  it('writes NULL rather than an empty string when the end is cleared', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit, { ...savedReservation, end_time: '23:00:00' });

    await userEvent.clear(screen.getByLabelText('End Time'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ end_time: null });
  });

  it('rejects an end time at or before the start', () => {
    const base = {
      restaurant_name: 'Septime',
      reservation_date: '2026-07-01',
      reservation_time: '19:30:00',
    };
    expect(reservationFormSchema.safeParse({ ...base, end_time: '19:30' }).success).toBe(false);
    expect(reservationFormSchema.safeParse({ ...base, end_time: '00:30' }).success).toBe(false);
    expect(reservationFormSchema.safeParse({ ...base, end_time: '21:00' }).success).toBe(true);
    expect(reservationFormSchema.safeParse({ ...base, end_time: null }).success).toBe(true);
  });

  it('accepts a null notes value from the database', () => {
    const parsed = reservationFormSchema.safeParse({
      restaurant_name: 'Septime',
      reservation_date: '2026-07-01',
      reservation_time: '19:30:00',
      notes: null,
    });
    expect(parsed.success).toBe(true);
  });
});
