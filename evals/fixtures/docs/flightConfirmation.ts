import type { FieldRule } from '../../helpers/fieldCompare';

export const flightConfirmation = {
  name: 'flight-confirmation',
  itemType: 'transportation' as const,
  text: `AIR FRANCE - FLIGHT CONFIRMATION

Booking reference: XK7Q2A
Passenger: Eval Traveler

Flight AF 007
From: New York John F. Kennedy (JFK)
To: Paris Charles de Gaulle (CDG)
Departure: Monday, September 14, 2026 at 08:05
Arrival: Monday, September 14, 2026 at 21:25
Cabin: Economy

Total fare: EUR 800.00`,
  golden: {
    type: 'flight',
    carrier: 'Air France',
    departure_location: 'New York',
    arrival_location: 'Paris Charles de Gaulle',
    departure_date: '2026-09-14',
    departure_time: '08:05',
    arrival_date: '2026-09-14',
    arrival_time: '21:25',
    confirmation_number: 'XK7Q2A',
    cost: 800,
    currency: 'EUR',
  },
  rules: {
    carrier: 'fuzzy',
    departure_location: 'fuzzy',
    arrival_location: 'fuzzy',
  } satisfies Partial<Record<string, FieldRule>>,
};
