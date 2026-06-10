// src/services/pdf/fixtures.ts
// Deterministic trip data for builder/render tests. No network, no Date.now().
import type { PdfTripData, ResolvedPdfOptions, Item } from './types';

/** Valid 1x1 black JPEG — exercises pdfmake image nodes without network. */
export const TINY_JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

const item = (partial: Partial<Item> & Pick<Item, 'type' | 'title' | 'time' | 'sortKey'>): Item => ({ ...partial }) as Item;

export const FIXTURE_OPTS: ResolvedPdfOptions = {
  showImages: true,
  showCosts: true,
  pageSize: 'LETTER',
  exportedAt: new Date('2026-06-10T09:14:00'),
};

export function romeTrip(): PdfTripData {
  return {
    destination: 'Rome',
    dateRange: 'Jun 12 – Jun 17',
    coverImageDataUri: TINY_JPEG,
    coverImageRequested: true,
    days: [
      {
        date: '2026-06-12',
        title: 'Arrival in Rome',
        description: 'Long travel day — keep the evening flexible.',
        hasTransport: true,
        activityCount: 3,
        items: [
          item({ type: 'accommodation', title: 'Check-in: Hotel Il Pellicano', time: '8:00 AM', details: 'Sea-view suite', location: 'Sbarcatello, Porto Ercole', cost: '€780.00', thumb: TINY_JPEG, sortKey: 480 }),
          item({ type: 'transportation', title: 'Flight: ITA Airways', time: '9:30 AM – 5:45 PM', details: 'AZ611 JFK–FCO', location: 'From: New York JFK to Rome FCO', cost: '$1,240.00', sortKey: 570 }),
          item({ type: 'activity', title: 'Colosseum Underground Tour', time: '11:00 AM', details: 'Meet at Arco di Costantino', cost: '€110.00', sortKey: 660 }),
          item({ type: 'dining', title: 'Dining: Roscioli', time: '1:00 PM', details: 'Ask for cellar table', location: '4 people • Via dei Giubbonari 21', cost: '€160.00', sortKey: 780 }),
        ],
      },
      {
        date: '2026-06-13',
        title: 'Classical Rome',
        hasTransport: false,
        activityCount: 2,
        items: [
          item({ type: 'activity', title: 'Vatican Museums', time: '10:00 AM', details: 'Pre-booked, group lane', cost: '€68.00', sortKey: 600 }),
          item({ type: 'dining', title: 'Dining: Pierluigi', time: '7:30 PM', location: '4 people • Piazza de\' Ricci 144', cost: '€190.00', sortKey: 1170 }),
        ],
      },
      { date: '2026-06-14', title: 'Quiet Day', hasTransport: false, activityCount: 0, items: [] },
    ],
    stays: [
      { hotel: 'Hotel Il Pellicano', checkIn: 'Jun 12', checkOut: 'Jun 15', address: 'Sbarcatello 1, Porto Ercole', phone: '+39 0564 858111', website: 'https://hotelilpellicano.com', checkInDate: '2026-06-12', checkOutDate: '2026-06-15' },
      { hotel: 'Hotel de Russie', checkIn: 'Jun 15', checkOut: 'Jun 17', checkInDate: '2026-06-15', checkOutDate: '2026-06-17' },
    ],
    transports: [
      { from: 'New York JFK', to: 'Rome FCO', date: 'Jun 12', type: 'Flight', confirmationNumber: 'AZ6XK2' },
      { from: 'Rome', to: 'Porto Ercole', date: 'Jun 12', type: 'Car Service' },
    ],
    diningRefs: [
      { restaurant: 'Roscioli', confirmationNumber: 'RSC-4421' },
    ],
    budgetData: {
      budget: 6000,
      categories: [
        { category: 'Accommodations', amount: 3120 },
        { category: 'Transportation', amount: 2480 },
        { category: 'Dining', amount: 890 },
      ],
      total: 6490,
    },
  };
}
