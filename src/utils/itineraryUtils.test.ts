import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatTime,
  createHero,
  convertHotelStayToItems,
  convertTransportationToItems,
  convertActivityToItems,
  convertReservationToItems,
  createItineraryDay,
  tripDataToItinerary,
} from './itineraryUtils';
import { DayActivity, HotelStay, RestaurantReservation, Transportation, TripDay } from '@/types/trip';
import { ItineraryData } from '@/types/itinerary';

describe('itineraryUtils', () => {
  describe('formatDate', () => {
    it('should format a date string to full display format', () => {
      expect(formatDate('2024-01-15')).toBe('Monday, January 15, 2024');
      expect(formatDate('2024-12-25')).toBe('Wednesday, December 25, 2024');
    });

    it('should return original string if parsing fails', () => {
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });

    it('should handle ISO date strings with time', () => {
      expect(formatDate('2024-06-15T10:30:00Z')).toBe('Saturday, June 15, 2024');
    });
  });

  describe('formatTime', () => {
    it('should format HH:MM time string to 12-hour format', () => {
      expect(formatTime('14:30')).toBe('2:30 PM');
      expect(formatTime('09:00')).toBe('9:00 AM');
      expect(formatTime('00:00')).toBe('12:00 AM');
      expect(formatTime('12:00')).toBe('12:00 PM');
    });

    it('should return empty string for null or undefined', () => {
      expect(formatTime(null)).toBe('');
      expect(formatTime(undefined)).toBe('');
    });

    it('should handle ISO datetime strings', () => {
      expect(formatTime('2024-01-15T14:30:00')).toBe('2:30 PM');
    });

    it('should return original string if parsing fails', () => {
      expect(formatTime('invalid')).toBe('invalid');
    });
  });

  describe('createHero', () => {
    it('should create hero section from trip data', () => {
      const data: ItineraryData = {
        trip: {
          trip_id: '1',
          destination: 'Paris',
          start_date: '2024-06-01',
          end_date: '2024-06-07',
          cover_image_url: 'https://example.com/paris.jpg',
        } as any,
        days: [],
        hotelStays: [],
        transportations: [],
        reservations: {},
      };

      const hero = createHero(data);

      expect(hero.title).toBe('Paris Trip Itinerary');
      expect(hero.bannerUrl).toBe('https://example.com/paris.jpg');
      expect(hero.dateRange).toContain('June 1, 2024');
      expect(hero.dateRange).toContain('June 7, 2024');
    });

    it('should handle missing dates', () => {
      const data: ItineraryData = {
        trip: {
          trip_id: '1',
          destination: 'Tokyo',
          start_date: null,
          end_date: null,
          cover_image_url: null,
        } as any,
        days: [],
        hotelStays: [],
        transportations: [],
        reservations: {},
      };

      const hero = createHero(data);

      expect(hero.title).toBe('Tokyo Trip Itinerary');
      expect(hero.dateRange).toBe('');
    });
  });

  describe('convertHotelStayToItems', () => {
    const baseHotelStay: HotelStay = {
      stay_id: 'stay-1',
      trip_id: 'trip-1',
      hotel: 'Grand Hotel',
      hotel_checkin_date: '2024-06-01',
      hotel_checkout_date: '2024-06-03',
      checkin_time: '15:00',
      checkout_time: '11:00',
      hotel_address: '123 Main St',
      hotel_details: 'Luxury suite',
      cost: 500,
      currency: 'USD',
      hotel_phone: null,
      hotel_website: null,
      hotel_place_id: null,
      hotel_confirmation_number: null,
      expense_type: 'accommodation',
      created_at: '2024-01-01',
    };

    it('should create check-in item on checkin date', () => {
      const item = convertHotelStayToItems(baseHotelStay, '2024-06-01');

      expect(item.id).toBe('stay-1');
      expect(item.type).toBe('accommodation');
      expect(item.title).toBe('Check-in: Grand Hotel');
      expect(item.time).toBe('3:00 PM');
      expect(item.meta).toContainEqual({ label: '123 Main St' });
      expect(item.meta).toContainEqual({ label: 'USD 500' });
    });

    it('should create check-out item on checkout date', () => {
      const item = convertHotelStayToItems(baseHotelStay, '2024-06-03');

      expect(item.title).toBe('Check-out: Grand Hotel');
      expect(item.time).toBe('11:00 AM');
    });

    it('should create stay item for intermediate days', () => {
      const item = convertHotelStayToItems(baseHotelStay, '2024-06-02');

      expect(item.title).toBe('Stay at Grand Hotel');
      expect(item.time).toBe('');
    });

    it('should handle hotel without cost', () => {
      const hotelWithoutCost = { ...baseHotelStay, cost: null, currency: null };
      const item = convertHotelStayToItems(hotelWithoutCost, '2024-06-01');

      expect(item.meta).not.toContainEqual(expect.objectContaining({ label: expect.stringContaining('USD') }));
    });
  });

  describe('convertTransportationToItems', () => {
    const baseTransportation: Transportation = {
      id: 'trans-1',
      trip_id: 'trip-1',
      type: 'flight',
      start_date: '2024-06-01',
      end_date: '2024-06-01',
      start_time: '10:00',
      end_time: '14:00',
      departure_location: 'JFK Airport',
      arrival_location: 'CDG Airport',
      provider: 'Air France',
      confirmation_number: 'ABC123',
      details: 'Business class',
      cost: 1500,
      currency: 'USD',
      created_at: '2024-01-01',
      expense_type: 'transportation',
    };

    it('should create transportation item for matching start date', () => {
      const item = convertTransportationToItems(baseTransportation, '2024-06-01');

      expect(item).not.toBeNull();
      expect(item!.id).toBe('trans-1');
      expect(item!.type).toBe('transportation');
      expect(item!.title).toBe('Flight: Air France');
      expect(item!.time).toBe('10:00 AM');
      expect(item!.meta).toContainEqual({ label: 'From: JFK Airport' });
      expect(item!.meta).toContainEqual({ label: 'To: CDG Airport' });
      expect(item!.meta).toContainEqual({ label: 'Provider: Air France' });
      expect(item!.meta).toContainEqual({ label: 'Confirmation: ABC123' });
      expect(item!.meta).toContainEqual({ label: 'USD 1500' });
    });

    it('should return null for non-matching date', () => {
      const item = convertTransportationToItems(baseTransportation, '2024-06-02');

      expect(item).toBeNull();
    });

    it('should handle non-flight transportation types', () => {
      const trainTransport = { ...baseTransportation, type: 'train' as const, provider: null };
      const item = convertTransportationToItems(trainTransport, '2024-06-01');

      expect(item!.title).toBe('Train');
    });

    it('should handle flight without provider', () => {
      const flightWithoutProvider = { ...baseTransportation, provider: null };
      const item = convertTransportationToItems(flightWithoutProvider, '2024-06-01');

      expect(item!.title).toBe('Flight');
    });
  });

  describe('convertActivityToItems', () => {
    const baseActivity: DayActivity = {
      id: 'act-1',
      day_id: 'day-1',
      title: 'Eiffel Tower Visit',
      description: 'See the iconic landmark',
      start_time: '09:00',
      end_time: '12:00',
      cost: 25,
      currency: 'EUR',
      order_index: 0,
      created_at: '2024-01-01',
      expense_type: 'activity',
    };

    it('should create activity item with all fields', () => {
      const item = convertActivityToItems(baseActivity);

      expect(item.id).toBe('act-1');
      expect(item.type).toBe('activity');
      expect(item.title).toBe('Eiffel Tower Visit');
      expect(item.subtitle).toBe('See the iconic landmark');
      expect(item.time).toBe('9:00 AM');
      expect(item.meta).toContainEqual({ label: 'EUR 25' });
    });

    it('should handle activity without time', () => {
      const activityWithoutTime = { ...baseActivity, start_time: null };
      const item = convertActivityToItems(activityWithoutTime);

      expect(item.time).toBeUndefined();
    });

    it('should handle activity without cost', () => {
      const activityWithoutCost = { ...baseActivity, cost: null, currency: null };
      const item = convertActivityToItems(activityWithoutCost);

      expect(item.meta).toHaveLength(0);
    });
  });

  describe('convertReservationToItems', () => {
    const baseReservation: RestaurantReservation = {
      id: 'res-1',
      day_id: 'day-1',
      restaurant_name: 'Le Petit Bistro',
      reservation_time: '19:30',
      number_of_people: 4,
      address: '456 Rue de Paris',
      phone_number: '+33 1 23 45 67 89',
      confirmation_number: 'RES456',
      notes: 'Window seat requested',
      cost: 200,
      currency: 'EUR',
      created_at: '2024-01-01',
      website: null,
      expense_type: 'dining',
    };

    it('should create dining item with all fields', () => {
      const item = convertReservationToItems(baseReservation);

      expect(item.id).toBe('res-1');
      expect(item.type).toBe('dining');
      expect(item.title).toBe('Dining: Le Petit Bistro');
      expect(item.subtitle).toBe('Window seat requested');
      expect(item.time).toBe('7:30 PM');
      expect(item.meta).toContainEqual({ label: '4 people' });
      expect(item.meta).toContainEqual({ label: '456 Rue de Paris' });
      expect(item.meta).toContainEqual({ label: '+33 1 23 45 67 89' });
      expect(item.meta).toContainEqual({ label: 'Confirmation: RES456' });
      expect(item.meta).toContainEqual({ label: 'EUR 200' });
    });

    it('should use singular "person" for party of 1', () => {
      const singleReservation = { ...baseReservation, number_of_people: 1 };
      const item = convertReservationToItems(singleReservation);

      expect(item.meta).toContainEqual({ label: '1 person' });
    });

    it('should handle reservation without optional fields', () => {
      const minimalReservation: RestaurantReservation = {
        id: 'res-2',
        day_id: 'day-1',
        restaurant_name: 'Quick Cafe',
        reservation_time: null,
        number_of_people: null,
        address: null,
        phone_number: null,
        confirmation_number: null,
        notes: null,
        cost: null,
        currency: null,
        created_at: '2024-01-01',
        website: null,
        expense_type: 'dining',
      };
      const item = convertReservationToItems(minimalReservation);

      expect(item.title).toBe('Dining: Quick Cafe');
      expect(item.time).toBeUndefined();
      expect(item.meta).toHaveLength(0);
    });
  });

  describe('createItineraryDay', () => {
    const baseDay: TripDay = {
      day_id: 'day-1',
      trip_id: 'trip-1',
      date: '2024-06-01',
      title: 'Arrival Day',
      activities: [],
      created_at: '2024-01-01',
    };

    it('should create itinerary day with sorted items', () => {
      const hotelStays: HotelStay[] = [{
        stay_id: 'stay-1',
        trip_id: 'trip-1',
        hotel: 'Grand Hotel',
        hotel_checkin_date: '2024-06-01',
        hotel_checkout_date: '2024-06-03',
        checkin_time: '15:00',
        checkout_time: '11:00',
        hotel_address: null,
        hotel_details: null,
        cost: null,
        currency: null,
        hotel_phone: null,
        hotel_website: null,
        hotel_place_id: null,
        hotel_confirmation_number: null,
        expense_type: 'accommodation',
        created_at: '2024-01-01',
      }];

      const transportations: Transportation[] = [{
        id: 'trans-1',
        trip_id: 'trip-1',
        type: 'flight',
        start_date: '2024-06-01',
        end_date: '2024-06-01',
        start_time: '10:00',
        end_time: '14:00',
        departure_location: 'JFK',
        arrival_location: 'CDG',
        provider: null,
        confirmation_number: null,
        details: null,
        cost: null,
        currency: null,
        created_at: '2024-01-01',
        expense_type: 'transportation',
      }];

      const reservations: RestaurantReservation[] = [{
        id: 'res-1',
        day_id: 'day-1',
        restaurant_name: 'Dinner Spot',
        reservation_time: '19:00',
        number_of_people: 2,
        address: null,
        phone_number: null,
        confirmation_number: null,
        notes: null,
        cost: null,
        currency: null,
        created_at: '2024-01-01',
        website: null,
        expense_type: 'dining',
      }];

      const itineraryDay = createItineraryDay(baseDay, hotelStays, transportations, reservations);

      expect(itineraryDay.title).toBe('Arrival Day');
      expect(itineraryDay.items).toHaveLength(3);

      // Items should be sorted by time: 10:00 AM flight, 3:00 PM checkin, 7:00 PM dinner
      expect(itineraryDay.items[0].title).toBe('Flight');
      expect(itineraryDay.items[1].title).toBe('Check-in: Grand Hotel');
      expect(itineraryDay.items[2].title).toBe('Dining: Dinner Spot');
    });

    it('should handle day with no items', () => {
      const itineraryDay = createItineraryDay(baseDay, [], [], []);

      expect(itineraryDay.title).toBe('Arrival Day');
      expect(itineraryDay.items).toHaveLength(0);
    });

    it('should use day_id as fallback title', () => {
      const dayWithoutTitle = { ...baseDay, title: null } as any;
      const itineraryDay = createItineraryDay(dayWithoutTitle, [], [], []);

      expect(itineraryDay.title).toBe('Day day-1');
    });
  });

  describe('tripDataToItinerary', () => {
    it('should convert trip data to full itinerary', () => {
      const data: ItineraryData = {
        trip: {
          trip_id: '1',
          destination: 'Paris',
          start_date: '2024-06-01',
          end_date: '2024-06-03',
          cover_image_url: null,
        } as any,
        days: [
          { day_id: 'day-2', trip_id: '1', date: '2024-06-02', title: 'Day 2', activities: [], created_at: '2024-01-01' },
          { day_id: 'day-1', trip_id: '1', date: '2024-06-01', title: 'Day 1', activities: [], created_at: '2024-01-01' },
        ],
        hotelStays: [],
        transportations: [],
        reservations: {},
      };

      const itinerary = tripDataToItinerary(data);

      expect(itinerary.hero.title).toBe('Paris Trip Itinerary');
      expect(itinerary.days).toHaveLength(2);
      // Days should be sorted by date
      expect(itinerary.days[0].title).toBe('Day 1');
      expect(itinerary.days[1].title).toBe('Day 2');
    });

    it('should handle empty trip data', () => {
      const data: ItineraryData = {
        trip: {
          trip_id: '1',
          destination: 'Empty Trip',
          start_date: null,
          end_date: null,
          cover_image_url: null,
        } as any,
        days: [],
        hotelStays: [],
        transportations: [],
        reservations: {},
      };

      const itinerary = tripDataToItinerary(data);

      expect(itinerary.hero.title).toBe('Empty Trip Trip Itinerary');
      expect(itinerary.days).toHaveLength(0);
    });
  });
});
