
import { parseISO, eachDayOfInterval, format, addDays } from 'date-fns';

export const generateDaysBetweenDates = (startDate: Date | string, endDate: Date | string) => {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  return eachDayOfInterval({ start, end }).map(date => ({
    date: format(date, 'yyyy-MM-dd'),
    title: format(date, 'EEEE, MMMM d'),
  }));
};

export const formatDateRange = (startDate: string, endDate: string) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
};

export const getDaysBetweenDates = (startDate: string, endDate: string): string[] => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  return eachDayOfInterval({ start, end })
    .map(date => format(date, 'yyyy-MM-dd'));
};


export const formatToTime = (time?: string): string => {
  if (!time) return '';
  
  // Handle different time formats
  try {
    // If time is in ISO format or contains 'T', extract just the time part
    if (time.includes('T')) {
      const parts = time.split('T');
      time = parts[1].substring(0, 5); // Extract HH:MM
    }
    
    // If time is already in HH:MM format, return it
    if (/^\d{2}:\d{2}$/.test(time)) {
      return time;
    }
    
    // If time is in HH:MM:SS format, truncate seconds
    if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
      return time.substring(0, 5);
    }
    
    // For other formats, try to parse it
    const date = new Date(`1970-01-01T${time}`);
    if (isNaN(date.getTime())) {
      console.warn('Invalid time format:', time);
      return time; // Return original if parsing fails
    }
    
    // Format to HH:MM
    return date.toTimeString().substring(0, 5);
  } catch (error) {
    console.error('Error formatting time:', time, error);
    return time; // Return original if any error occurs
  }
};
