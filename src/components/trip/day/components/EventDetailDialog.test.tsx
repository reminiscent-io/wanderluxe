import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EventDetailDialog, { EventDetail } from './EventDetailDialog';
import type { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';

// Both children reach the Supabase client / Places proxy, which validate env at
// import time. The dialog's own job is the field mapping, so stub them out.
vi.mock('../../timeline/TravelerAvatars', () => ({ default: () => <div data-testid="travelers" /> }));
vi.mock('./HotelPhotoThumb', () => ({ default: () => <div data-testid="photo" /> }));

const renderDialog = (event: EventDetail, canEdit = true) => {
  const onEdit = vi.fn();
  render(
    <EventDetailDialog
      event={event}
      open
      onOpenChange={vi.fn()}
      tripId="trip-1"
      canEdit={canEdit}
      onEdit={onEdit}
    />,
  );
  return { onEdit };
};

const activity = {
  id: 'a1',
  day_id: 'd1',
  trip_id: 'trip-1',
  title: 'Half-day private boat',
  description: 'Colombier Bay, snorkel stop',
  start_time: '09:30',
  end_time: '15:00',
  cost: 2000,
  currency: 'EUR',
  order_index: 0,
  created_at: '',
  is_paid: true,
  location_address: '12 Quai General de Gaulle',
  location_phone: '+590 590 00 00 00',
  location_rating: 4.8,
  location_website: 'https://example.com',
} as DayActivity;

describe('EventDetailDialog', () => {
  it('shows an activity read-only, with every populated field', () => {
    renderDialog({ kind: 'activity', data: activity });

    expect(screen.getByText('Half-day private boat')).toBeInTheDocument();
    expect(screen.getByText('9:30 AM – 3:00 PM')).toBeInTheDocument();
    expect(screen.getByText('12 Quai General de Gaulle')).toBeInTheDocument();
    expect(screen.getByText('+590 590 00 00 00')).toBeInTheDocument();
    expect(screen.getByText('Colombier Bay, snorkel stop')).toBeInTheDocument();
    // cost carries its paid state on the same line
    expect(screen.getByText('€2,000 · Paid')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Website/ })).toHaveAttribute('href', 'https://example.com');
  });

  it('omits fields the event does not carry', () => {
    renderDialog({
      kind: 'activity',
      data: { ...activity, location_address: null, location_phone: null, cost: null, description: undefined },
    });

    expect(screen.queryByText('Address')).not.toBeInTheDocument();
    expect(screen.queryByText('Phone')).not.toBeInTheDocument();
    expect(screen.queryByText('Cost')).not.toBeInTheDocument();
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
    // the one it does carry survives
    expect(screen.getByText('Time')).toBeInTheDocument();
  });

  it('routes Edit through the callback rather than editing inline', () => {
    const { onEdit } = renderDialog({ kind: 'activity', data: activity });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
    expect(onEdit).toHaveBeenCalledWith({ kind: 'activity', data: activity });
  });

  it('hides Edit without permission', () => {
    renderDialog({ kind: 'activity', data: activity }, false);
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
  });

  it('renders a stay, including both dates and times', () => {
    renderDialog({
      kind: 'hotel',
      data: {
        stay_id: 's1',
        trip_id: 'trip-1',
        hotel: 'Hotel Manapany',
        hotel_checkin_date: '2026-12-21',
        hotel_checkout_date: '2026-12-28',
        checkin_time: '15:00',
        checkout_time: '11:00',
        hotel_details: null,
        hotel_url: null,
        cost: 8400,
        currency: 'USD',
        hotel_address: 'Anse des Cayes',
        hotel_phone: null,
        hotel_place_id: null,
        hotel_website: null,
        created_at: '',
      } as HotelStay,
    });

    expect(screen.getByText('Hotel Manapany')).toBeInTheDocument();
    expect(screen.getByText('Mon, Dec 21 · 3:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Mon, Dec 28 · 11:00 AM')).toBeInTheDocument();
  });

  it('renders transportation with both endpoints', () => {
    renderDialog({
      kind: 'transportation',
      data: {
        id: 't1',
        trip_id: 'trip-1',
        type: 'flight',
        provider: 'Air France',
        details: null,
        confirmation_number: 'XR7T2P',
        start_date: '2026-12-21',
        start_time: '06:15',
        end_date: '2026-12-21',
        end_time: '14:40',
        departure_location: 'JFK',
        arrival_location: 'SXM',
        cost: null,
        currency: null,
        is_paid: false,
        created_at: '',
      } as Transportation,
    });

    expect(screen.getByText('JFK → SXM')).toBeInTheDocument();
    expect(screen.getByText('Air France')).toBeInTheDocument();
    expect(screen.getByText('XR7T2P')).toBeInTheDocument();
    expect(screen.getByText('JFK · Mon, Dec 21 · 6:15 AM')).toBeInTheDocument();
    expect(screen.getByText('SXM · Mon, Dec 21 · 2:40 PM')).toBeInTheDocument();
  });

  it('renders a reservation and pluralises the party correctly', () => {
    const base = {
      id: 'r1',
      day_id: 'd1',
      trip_id: 'trip-1',
      restaurant_name: 'Bonito',
      reservation_time: '19:30',
      end_time: null,
      number_of_people: 1,
      notes: null,
      confirmation_number: null,
      cost: null,
      currency: null,
      is_paid: false,
      address: null,
      phone_number: null,
      place_id: null,
      rating: null,
      created_at: '',
      order_index: 0,
    } as RestaurantReservation;

    const { unmount } = render(
      <EventDetailDialog
        event={{ kind: 'dining', data: base }}
        open
        onOpenChange={vi.fn()}
        tripId="trip-1"
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('1 guest')).toBeInTheDocument();
    unmount();

    renderDialog({ kind: 'dining', data: { ...base, number_of_people: 4 } });
    expect(screen.getByText('4 guests')).toBeInTheDocument();
  });
});
