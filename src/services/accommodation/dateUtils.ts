import { format, parse, addDays, isBefore, isEqual, differenceInDays } from 'date-fns';

/**
 * Generates an array of dates between start and end (inclusive)
 */
export const generateDatesArray = (startDate: string, endDate: string): string[] => {
  if (!startDate || !endDate) {
    console.error('Invalid dates provided to generateDatesArray', { startDate, endDate });
    return [];
  }

  const datesArray: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('Invalid dates provided to generateDatesArray', { startDate, endDate, start, end });
    return [];
  }

  // Generate array of dates between start and end (inclusive of start)
  const current = new Date(start);
  while (current <= end) { //Corrected the comparison to include the end date.
    const dateString = current.toISOString().split('T')[0];
    datesArray.push(dateString);
    current.setDate(current.getDate() + 1);
  }


  console.log(`Generated ${datesArray.length} dates:`, datesArray);
  return datesArray;
};

// Create alias for backward compatibility
export const generateDateArray = generateDatesArray;