import type { FieldRule } from '../../helpers/fieldCompare';

// Golden doc: hotel confirmation. Dates include weekday-free absolute dates so
// the function's year-inference never has to guess.
export const hotelConfirmation = {
  name: 'hotel-confirmation',
  itemType: 'accommodation' as const,
  text: `BOOKING CONFIRMATION

Hôtel Le Meurice
228 Rue de Rivoli, 75001 Paris, France
Phone: +33 1 44 58 10 10

Confirmation number: LM-2026-77412
Guest: Eval Traveler
Room: Deluxe King, 1 room, 2 adults

Check-in: September 14, 2026, from 15:00
Check-out: September 17, 2026, by 12:00

Total for 3 nights: EUR 1200.00
Payment: due at the property`,
  golden: {
    name: 'Hôtel Le Meurice',
    address: '228 Rue de Rivoli, 75001 Paris',
    check_in_date: '2026-09-14',
    check_in_time: '15:00',
    check_out_date: '2026-09-17',
    check_out_time: '12:00',
    confirmation_number: 'LM-2026-77412',
    cost: 1200,
    currency: 'EUR',
  },
  rules: { name: 'fuzzy', address: 'fuzzy' } satisfies Partial<Record<string, FieldRule>>,
};
