import { parseISO, startOfDay, differenceInDays } from 'date-fns';

export function formatDateRange(startDate: string, endDate: string): string {
  // Normalize both dates to the start of the day to avoid timezone discrepancies.
  const start = startOfDay(parseISO(startDate));
  const end = startOfDay(parseISO(endDate));
  // Calculate the number of nights (ensure the checkout day isn’t counted as a full night)
  const nights = differenceInDays(end, start);
  return `${nights} night${nights === 1 ? '' : 's'}`;
}
