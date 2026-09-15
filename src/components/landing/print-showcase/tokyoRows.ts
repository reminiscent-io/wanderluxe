// The trip behind the landing page's Print Studio section.
//
// Tokyo, because the app screenshots above it are Tokyo: a visitor should read
// the page as one trip moving through the product, not four unrelated demos.
//
// Raw rows rather than projected data, because this one fixture feeds three
// consumers: the pdfmake page, the Studio document, and the model that designs
// the sample editions (see scripts/build-print-showcase.ts).

import type { PdfTripRows } from '@/services/pdf/data';

const DAY_1 = '11111111-1111-4111-8111-111111111111';
const DAY_2 = '22222222-2222-4222-8222-222222222222';
const DAY_3 = '33333333-3333-4333-8333-333333333333';

export const TOKYO_ROWS: PdfTripRows = {
  trip: {
    destination: 'Tokyo',
    arrival_date: '2026-10-03',
    departure_date: '2026-10-05',
    cover_image_url: null,
    budget: 4200,
    timezone: 'Asia/Tokyo',
  },
  days: [
    { day_id: DAY_1, date: '2026-10-03', title: 'Landing, and a first walk', description: null },
    { day_id: DAY_2, date: '2026-10-04', title: 'Teamlab, then Shibuya', description: null },
    { day_id: DAY_3, date: '2026-10-05', title: 'Tsukiji, and the train west', description: null },
  ] as PdfTripRows['days'],
  stays: [
    {
      hotel: 'Hotel Ryumeikan Ochanomizu',
      hotel_address: '3-4 Kanda Surugadai, Chiyoda City, Tokyo',
      hotel_phone: '+81 3-3251-1135',
      hotel_website: null,
      hotel_details: 'Corner room, city side',
      hotel_checkin_date: '2026-10-03',
      hotel_checkout_date: '2026-10-05',
      checkin_time: '18:00',
      checkout_time: '11:00',
      cost: 980,
      currency: 'USD',
      image_url: null,
      timezone: null,
    },
  ] as PdfTripRows['stays'],
  trans: [
    {
      type: 'flight',
      provider: 'ANA 175',
      departure_location: 'San Francisco (SFO)',
      arrival_location: 'Tokyo (HND)',
      start_date: '2026-10-03',
      start_time: '11:05',
      end_time: '15:40',
      confirmation_number: 'NH4K7Q2',
      details: 'Two checked bags',
      cost: 1460,
      currency: 'USD',
      departure_timezone: 'America/Los_Angeles',
      arrival_timezone: 'Asia/Tokyo',
    },
  ] as PdfTripRows['trans'],
  acts: [
    {
      day_id: DAY_1,
      title: 'Walk the Kanda river to Akihabara',
      description: 'Slow first evening, no tickets, no plan',
      start_time: '19:30',
      cost: null,
      currency: null,
      timezone: null,
    },
    {
      day_id: DAY_2,
      title: 'teamLab Planets',
      description: 'Barefoot rooms; arrive before the afternoon crowd',
      start_time: '10:00',
      cost: 38,
      currency: 'USD',
      timezone: null,
    },
    {
      day_id: DAY_2,
      title: 'Shibuya Sky at sunset',
      description: null,
      start_time: '17:15',
      cost: 26,
      currency: 'USD',
      timezone: null,
    },
    {
      day_id: DAY_3,
      title: 'Tsukiji outer market, early',
      description: 'Tamagoyaki stand on the second lane',
      start_time: '07:30',
      cost: null,
      currency: null,
      timezone: null,
    },
  ] as PdfTripRows['acts'],
  dine: [
    {
      day_id: DAY_2,
      restaurant_name: 'Sushi Sho',
      address: '1-11 Yotsuya, Shinjuku City, Tokyo',
      reservation_time: '20:00',
      number_of_people: 2,
      confirmation_number: 'SS-4471',
      notes: 'Counter seats, omakase only',
      cost: 310,
      currency: 'USD',
      timezone: null,
    },
  ] as PdfTripRows['dine'],
  otherExpenses: [],
};

/**
 * The three directions the sample editions are generated from.
 *
 * Each names a saturated register on purpose. The sanitizer holds every text
 * role to a WCAG floor against a light printed ground, so a pale prompt
 * ("sun-bleached", "pastel") comes back with primary, secondary and accent all
 * demoted to the same ink — a real edition, but a monochrome one that shows a
 * visitor nothing about a custom palette. Deep inks survive the floors.
 */
export const TOKYO_THEMES = [
  'Ukiyo-e woodblock',
  'Art deco poster',
  'Botanical notes',
];
