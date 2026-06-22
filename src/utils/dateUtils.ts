
import { format, parse, parseISO, addDays, startOfDay, differenceInDays } from 'date-fns';

// Parse a date string as local time (avoids UTC shift from `new Date()`)
export const parseLocal = (dateString: string): Date => {
  // Date-only strings like "2024-01-15" → parse as local time
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return parse(dateString, 'yyyy-MM-dd', new Date());
  }
  // Full ISO strings with time/timezone → use Date constructor
  return new Date(dateString);
};

// Format a date string to display format (e.g., "Jan 1, 2024")
export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '';
  try {
    const date = parseLocal(dateString);
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

// Format a time string from "HH:MM:SS" to "h:mm a" (e.g., "2:30 pm")
export const formatToTime = (timeString?: string | null): string => {
  if (!timeString) return '';

  try {
    // Parse the time string (HH:MM:SS) into a Date object
    const parsedTime = parse(timeString, 'HH:mm:ss', new Date());

    // Format the Date object to the desired output format
    return format(parsedTime, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString; // Return the original string if parsing fails
  }
};

/**
 * Generates an array of date strings between start and end (inclusive).
 * Uses local-date parsing to avoid timezone/DST bugs.
 */
export const generateDateArray = (startDate: string, endDate: string): string[] => {
  if (!startDate || !endDate) {
    console.error('Invalid dates provided to generateDateArray', { startDate, endDate });
    return [];
  }

  const start = parseLocal(startDate);
  const end = parseLocal(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('Invalid dates provided to generateDateArray', { startDate, endDate });
    return [];
  }

  const datesArray: string[] = [];
  let current = start;
  while (current <= end) {
    datesArray.push(format(current, 'yyyy-MM-dd'));
    current = addDays(current, 1);
  }

  return datesArray;
};

export const generateDatesArray = generateDateArray;

// Calculate the number of days between two dates
export const calculateDurationInDays = (startDateStr?: string, endDateStr?: string): number => {
  if (!startDateStr || !endDateStr) return 0;

  try {
    const startDate = parseLocal(startDateStr);
    const endDate = parseLocal(endDateStr);

    // Add 1 to include both the start and end day
    return differenceInDays(endDate, startDate) + 1;
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 0;
  }
};

// Format a date range for display (e.g., "Jan 1 - Jan 15, 2024")
export const formatDateRange = (startDateStr?: string | null, endDateStr?: string | null): string => {
  if (!startDateStr || !endDateStr) return '';

  try {
    const startDate = parseLocal(startDateStr);
    const endDate = parseLocal(endDateStr);

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn('Invalid date format in formatDateRange:', { startDateStr, endDateStr });
      return '';
    }

    // Format the dates
    // If same year, only show year once at the end
    if (startDate.getFullYear() === endDate.getFullYear()) {
      // If same month, only show month once
      if (startDate.getMonth() === endDate.getMonth()) {
        return `${format(startDate, 'MMM d')} - ${format(endDate, 'd, yyyy')}`;
      }
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    }

    // Different years, show full format for both
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
  } catch (error) {
    console.error('Error formatting date range:', error);
    return '';
  }
};

// Format a date range as night count (e.g., "3 nights")
export function formatNightsCount(startDate: string, endDate: string): string {
  const start = startOfDay(parseISO(startDate));
  const end = startOfDay(parseISO(endDate));
  const nights = differenceInDays(end, start);
  return `${nights} night${nights === 1 ? '' : 's'}`;
}
