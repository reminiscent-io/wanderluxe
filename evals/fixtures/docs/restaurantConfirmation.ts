import type { FieldRule } from '../../helpers/fieldCompare';

// September 15, 2026 really is a Tuesday — the weekday corroborates the
// function's date inference instead of fighting it.
export const restaurantConfirmation = {
  name: 'restaurant-confirmation',
  itemType: 'reservation' as const,
  text: `RESERVATION CONFIRMED

Septime
80 Rue de Charonne, 75011 Paris, France

Confirmation: SEP-2031
Date: Tuesday, September 15, 2026
Time: 8:00 PM
Party size: 2 guests

Please arrive on time; tables are held for 15 minutes.`,
  golden: {
    restaurant_name: 'Septime',
    date: '2026-09-15',
    time: '20:00',
    party_size: 2,
    address: '80 Rue de Charonne, 75011 Paris',
    confirmation_number: 'SEP-2031',
  },
  rules: {
    restaurant_name: 'fuzzy',
    address: 'fuzzy',
  } satisfies Partial<Record<string, FieldRule>>,
};
