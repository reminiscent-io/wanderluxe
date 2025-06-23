
/**
 * Centralized query keys for React Query
 */

export const reservationsKey = (tripId: string, dayId?: string) => {
  const base = ['reservations', tripId];
  return dayId ? [...base, dayId] : base;
};

export const tripsKey = (userId?: string) => {
  const base = ['trips'];
  return userId ? [...base, userId] : base;
};

export const tripKey = (tripId: string) => ['trip', tripId];

export const accommodationsKey = (tripId: string) => ['accommodations', tripId];

export const transportationKey = (tripId: string) => ['transportation', tripId];

export const activitiesKey = (dayId: string) => ['activities', dayId];

export const budgetKey = (tripId: string) => ['budget', tripId];
