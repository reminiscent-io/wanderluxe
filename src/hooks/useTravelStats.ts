import { useMemo } from 'react';
import { differenceInDays, parseISO, format, subMonths, subDays, addMonths, startOfMonth, endOfMonth, min as dateMin, max as dateMax } from 'date-fns';
import { Trip } from '@/types/trip';

interface MonthlyActivity {
  month: string;
  days: number;
}

export interface DailyTripInfo {
  tripId: string;
  destination: string;
  arrivalDate: string;
  departureDate: string;
  coverImageUrl: string | null;
}

export interface DailyActivity {
  date: Date;
  traveling: boolean;
  trips: DailyTripInfo[];
}

interface TravelStats {
  totalDaysTraveled: number;
  completedTrips: number;
  activeTrips: number;
  upcomingTrips: number;
  monthlyActivity: MonthlyActivity[];
  dailyActivity: DailyActivity[];
  completionRate: { completed: number; total: number };
  countriesVisited: number;
  longestTrip: { destination: string; days: number } | null;
}

function getTripCategory(trip: Trip): 'upcoming' | 'current' | 'past' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const arrivalDate = new Date(trip.arrival_date || '');
  const departureDate = new Date(trip.departure_date || '');

  if (today >= arrivalDate && today <= departureDate) {
    return 'current';
  }

  if (arrivalDate > today) {
    return 'upcoming';
  }

  return 'past';
}

function calculateDaysInMonth(trips: Trip[], monthDate: Date): number {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  let totalDays = 0;

  trips.forEach(trip => {
    if (!trip.arrival_date || !trip.departure_date) return;

    const tripStart = parseISO(trip.arrival_date);
    const tripEnd = parseISO(trip.departure_date);

    // Check if trip overlaps with this month
    if (tripEnd < monthStart || tripStart > monthEnd) return;

    // Calculate overlap
    const overlapStart = tripStart < monthStart ? monthStart : tripStart;
    const overlapEnd = tripEnd > monthEnd ? monthEnd : tripEnd;

    const days = differenceInDays(overlapEnd, overlapStart) + 1;
    if (days > 0) {
      totalDays += days;
    }
  });

  return totalDays;
}

function buildDailyActivity(allTrips: Trip[]): DailyActivity[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const twelveMonthsAgo = subMonths(today, 12);
  const twelveMonthsAhead = addMonths(today, 12);

  // Find oldest trip start and latest trip end
  let oldestTripDate = twelveMonthsAgo;
  let latestTripDate = twelveMonthsAhead;

  for (const trip of allTrips) {
    if (trip.arrival_date) {
      const d = parseISO(trip.arrival_date);
      if (d < oldestTripDate) oldestTripDate = d;
    }
    if (trip.departure_date) {
      const d = parseISO(trip.departure_date);
      if (d > latestTripDate) latestTripDate = d;
    }
  }

  // Min date: older of (oldest trip) or (12 months ago)
  const minDate = dateMin([oldestTripDate, twelveMonthsAgo]);
  // Max date: greater of (latest trip end) or (12 months ahead)
  const maxDate = dateMax([latestTripDate, twelveMonthsAhead]);

  minDate.setHours(0, 0, 0, 0);
  maxDate.setHours(0, 0, 0, 0);

  const totalDays = differenceInDays(maxDate, minDate);
  const result: DailyActivity[] = [];

  for (let i = 0; i <= totalDays; i++) {
    const date = subDays(maxDate, totalDays - i);
    date.setHours(0, 0, 0, 0);
    const matchingTrips: DailyTripInfo[] = [];

    for (const trip of allTrips) {
      if (!trip.arrival_date || !trip.departure_date) continue;
      const start = parseISO(trip.arrival_date);
      const end = parseISO(trip.departure_date);
      if (date >= start && date <= end) {
        matchingTrips.push({
          tripId: trip.trip_id,
          destination: trip.destination,
          arrivalDate: trip.arrival_date,
          departureDate: trip.departure_date,
          coverImageUrl: trip.cover_image_url,
        });
      }
    }

    result.push({ date, traveling: matchingTrips.length > 0, trips: matchingTrips });
  }

  return result;
}

export function useTravelStats(trips: Trip[]): TravelStats {
  return useMemo(() => {
    if (!trips || trips.length === 0) {
      return {
        totalDaysTraveled: 0,
        completedTrips: 0,
        activeTrips: 0,
        upcomingTrips: 0,
        monthlyActivity: Array.from({ length: 12 }, (_, i) => ({
          month: format(subMonths(new Date(), 11 - i), 'MMM'),
          days: 0
        })),
        dailyActivity: buildDailyActivity([]),
        completionRate: { completed: 0, total: 0 },
        countriesVisited: 0,
        longestTrip: null
      };
    }

    const pastTrips = trips.filter(trip => getTripCategory(trip) === 'past');
    const currentTrips = trips.filter(trip => getTripCategory(trip) === 'current');
    const upcomingTrips = trips.filter(trip => getTripCategory(trip) === 'upcoming');

    // Calculate total days traveled (from completed trips only)
    const totalDaysTraveled = pastTrips.reduce((sum, trip) => {
      if (!trip.arrival_date || !trip.departure_date) return sum;
      const days = differenceInDays(
        parseISO(trip.departure_date),
        parseISO(trip.arrival_date)
      ) + 1;
      return sum + Math.max(0, days);
    }, 0);

    // Calculate monthly activity for the last 12 months
    const monthlyActivity = Array.from({ length: 12 }, (_, i) => {
      const monthDate = subMonths(new Date(), 11 - i);
      const monthKey = format(monthDate, 'MMM');
      const daysInMonth = calculateDaysInMonth([...pastTrips, ...currentTrips], monthDate);
      return { month: monthKey, days: daysInMonth };
    });

    // Estimate unique destinations (countries/cities)
    const uniqueDestinations = new Set(
      trips
        .map(trip => {
          // Extract country/city from destination
          const parts = trip.destination.split(',');
          return parts[parts.length - 1]?.trim() || trip.destination;
        })
        .filter(Boolean)
    );

    // Find longest trip
    let longestTrip: { destination: string; days: number } | null = null;
    pastTrips.forEach(trip => {
      if (!trip.arrival_date || !trip.departure_date) return;
      const days = differenceInDays(
        parseISO(trip.departure_date),
        parseISO(trip.arrival_date)
      ) + 1;
      if (!longestTrip || days > longestTrip.days) {
        longestTrip = { destination: trip.destination, days };
      }
    });

    // Build daily activity spanning all trips (past, current, and upcoming)
    const dailyActivity = buildDailyActivity(trips);

    return {
      totalDaysTraveled,
      completedTrips: pastTrips.length,
      activeTrips: currentTrips.length,
      upcomingTrips: upcomingTrips.length,
      monthlyActivity,
      dailyActivity,
      completionRate: {
        completed: pastTrips.length,
        total: pastTrips.length + currentTrips.length + upcomingTrips.length
      },
      countriesVisited: uniqueDestinations.size,
      longestTrip
    };
  }, [trips]);
}
