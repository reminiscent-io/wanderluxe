import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

const renderForm = (onSubmit: ReturnType<typeof vi.fn>) =>
  render(
    <RestaurantReservationForm
      onSubmit={onSubmit}
      defaultValues={savedReservation}
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
