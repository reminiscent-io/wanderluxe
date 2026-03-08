
import { format, parse, addDays, isBefore, isEqual, differenceInDays } from 'date-fns';

/**
 * Parse a "YYYY-MM-DD" string as a local-midnight Date (no UTC offset issues).
 */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Generates an array of date strings between start and end (inclusive).
 * Uses local-date parsing and date-fns arithmetic to avoid timezone/DST bugs.
 */
export const generateDateArray = (startDate: string, endDate: string): string[] => {
  if (!startDate || !endDate) {
    console.error('Invalid dates provided to generateDateArray', { startDate, endDate });
    return [];
  }

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

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
