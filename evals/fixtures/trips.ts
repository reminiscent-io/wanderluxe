// Canonical eval fixtures. Every UUID is FIXED so that (a) eval assertions
// are stable across runs and (b) seeding is an idempotent upsert/replace.
// Dates are fixed in Sept/Nov 2026; if they pass, bump them a year and
// re-seed (the chat suite only assumes "future trip", never "N days away").

export const PARIS_TRIP_ID = '11111111-1111-4111-8111-111111111111';
export const MINIMAL_TRIP_ID = '22222222-2222-4222-8222-222222222222';
// Never seeded — used to verify RLS indistinguishability ("not found" reply).
export const INACCESSIBLE_TRIP_ID = '99999999-9999-4999-8999-999999999999';

export const PARIS_DAY_IDS = [
  '33333333-3333-4333-8333-000000000001',
  '33333333-3333-4333-8333-000000000002',
  '33333333-3333-4333-8333-000000000003',
] as const;

export const PARIS_STAY_ID = '44444444-4444-4444-8444-000000000001';
export const PARIS_STAY_DAY_IDS = [
  '55555555-5555-4555-8555-000000000001',
  '55555555-5555-4555-8555-000000000002',
  '55555555-5555-4555-8555-000000000003',
] as const;
export const PARIS_FLIGHT_ID = '66666666-6666-4666-8666-000000000001';
export const PARIS_ACTIVITY_IDS = [
  '77777777-7777-4777-8777-000000000001',
  '77777777-7777-4777-8777-000000000002',
  '77777777-7777-4777-8777-000000000003',
  '77777777-7777-4777-8777-000000000004',
  '77777777-7777-4777-8777-000000000005',
] as const;
export const PARIS_RESERVATION_IDS = [
  '88888888-8888-4888-8888-000000000001',
  '88888888-8888-4888-8888-000000000002',
] as const;
export const PARIS_OTHER_EXPENSE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001';

// --- trips ---
export const PARIS_TRIP = {
  trip_id: PARIS_TRIP_ID,
  destination: 'Paris, France',
  arrival_date: '2026-09-14',
  departure_date: '2026-09-17',
  budget: 5000,
  is_public: false,
};

export const MINIMAL_TRIP = {
  trip_id: MINIMAL_TRIP_ID,
  destination: 'Lisbon, Portugal',
  arrival_date: '2026-11-02',
  departure_date: '2026-11-05',
  budget: null as number | null,
  is_public: false,
};

// --- trip_days (Paris) ---
export const PARIS_DAYS = [
  { day_id: PARIS_DAY_IDS[0], trip_id: PARIS_TRIP_ID, date: '2026-09-14', title: 'Arrival & Tuileries' },
  { day_id: PARIS_DAY_IDS[1], trip_id: PARIS_TRIP_ID, date: '2026-09-15', title: 'Museums Day' },
  { day_id: PARIS_DAY_IDS[2], trip_id: PARIS_TRIP_ID, date: '2026-09-16', title: 'Versailles Day' },
];

// --- accommodations (Paris) ---
export const PARIS_HOTEL = {
  stay_id: PARIS_STAY_ID,
  trip_id: PARIS_TRIP_ID,
  title: 'Hôtel Le Meurice',
  hotel: 'Hôtel Le Meurice',
  hotel_address: '228 Rue de Rivoli, 75001 Paris, France',
  hotel_phone: '+33 1 44 58 10 10',
  hotel_checkin_date: '2026-09-14',
  hotel_checkout_date: '2026-09-17',
  checkin_time: '15:00:00',
  checkout_time: '12:00:00',
  cost: 1200,
  currency: 'EUR',
  amount_paid: 600,
  is_paid: false,
  order_index: 0,
};

export const PARIS_STAY_DAYS = PARIS_STAY_DAY_IDS.map((id, i) => ({
  id,
  stay_id: PARIS_STAY_ID,
  day_id: PARIS_DAY_IDS[i],
  date: PARIS_DAYS[i].date,
}));

// --- transportation (Paris) ---
export const PARIS_FLIGHT = {
  id: PARIS_FLIGHT_ID,
  trip_id: PARIS_TRIP_ID,
  type: 'flight',
  provider: 'Air France',
  flight_number: 'AF007',
  confirmation_number: 'XK7Q2A',
  departure_location: 'New York JFK',
  arrival_location: 'Paris CDG',
  start_date: '2026-09-14',
  start_time: '08:05:00',
  end_date: '2026-09-14',
  end_time: '21:25:00',
  cost: 800,
  currency: 'EUR',
};

// --- day_activities (Paris) ---
export const PARIS_ACTIVITIES = [
  {
    id: PARIS_ACTIVITY_IDS[0], trip_id: PARIS_TRIP_ID, day_id: PARIS_DAY_IDS[0],
    title: 'Louvre Museum guided tour', start_time: '10:00:00', end_time: '13:00:00',
    cost: 60, currency: 'EUR', amount_paid: 60, is_paid: true, order_index: 0,
  },
  {
    id: PARIS_ACTIVITY_IDS[1], trip_id: PARIS_TRIP_ID, day_id: PARIS_DAY_IDS[0],
    title: 'Seine river cruise', start_time: '18:00:00', end_time: '19:30:00',
    cost: 40, currency: 'EUR', amount_paid: 0, is_paid: false, order_index: 1,
  },
  {
    id: PARIS_ACTIVITY_IDS[2], trip_id: PARIS_TRIP_ID, day_id: PARIS_DAY_IDS[1],
    title: 'Eiffel Tower summit visit', start_time: '09:30:00', end_time: '12:00:00',
    cost: 75, currency: 'EUR', amount_paid: 0, is_paid: false, order_index: 0,
  },
  {
    id: PARIS_ACTIVITY_IDS[3], trip_id: PARIS_TRIP_ID, day_id: PARIS_DAY_IDS[1],
    title: "Musée d'Orsay visit", start_time: '14:00:00', end_time: '17:00:00',
    cost: 32, currency: 'EUR', amount_paid: 0, is_paid: false, order_index: 1,
  },
  {
    id: PARIS_ACTIVITY_IDS[4], trip_id: PARIS_TRIP_ID, day_id: PARIS_DAY_IDS[2],
    title: 'Palace of Versailles day trip', start_time: '09:00:00', end_time: '16:00:00',
    cost: 90, currency: 'EUR', amount_paid: 0, is_paid: false, order_index: 0,
  },
];

// --- reservations (Paris) ---
export const PARIS_RESERVATIONS = [
  {
    id: PARIS_RESERVATION_IDS[0], trip_id: PARIS_TRIP_ID, day_id: PARIS_DAY_IDS[0],
    restaurant_name: 'Le Cinq', reservation_time: '19:30:00', number_of_people: 2,
    address: '31 Avenue George V, 75008 Paris, France', confirmation_number: 'LC-88421',
    cost: 350, currency: 'EUR', amount_paid: 100, is_paid: false, order_index: 0,
  },
  {
    id: PARIS_RESERVATION_IDS[1], trip_id: PARIS_TRIP_ID, day_id: PARIS_DAY_IDS[1],
    restaurant_name: 'Septime', reservation_time: '20:00:00', number_of_people: 2,
    address: '80 Rue de Charonne, 75011 Paris, France', confirmation_number: 'SEP-2031',
    cost: 200, currency: 'EUR', amount_paid: 0, is_paid: false, order_index: 0,
  },
];

// --- other_expenses (Paris) ---
export const PARIS_OTHER_EXPENSE = {
  id: PARIS_OTHER_EXPENSE_ID,
  trip_id: PARIS_TRIP_ID,
  description: 'Museum pass & metro cards',
  date: '2026-09-14',
  cost: 50,
  currency: 'EUR',
  amount_paid: 50,
  is_paid: true,
};

// --- expected budget constants (asserted by the MCP suite) ---
// NOTE: get_trip_budget does not select amount_paid for transportation,
// so transportation.paid is 0 by construction.
export const PARIS_BUDGET = {
  accommodations: { total: 1200, paid: 600 },
  transportation: { total: 800, paid: 0 },
  activities: { total: 297, paid: 60 }, // 60+40+75+32+90
  dining: { total: 550, paid: 100 }, // 350+200
  other: { total: 50, paid: 50 },
  total_cost: 2897,
  total_paid: 810,
};
