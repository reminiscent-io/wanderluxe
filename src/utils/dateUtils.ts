
import { format, parse, addDays, isBefore, isEqual, differenceInDays } from 'date-fns';

// Format a date string to display format (e.g., "Jan 1, 2024")
export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
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

// Generate an array of date strings between start and end dates (inclusive)
export const getDaysBetweenDates = (startDateStr: string, endDateStr: string): string[] => {
  try {
    // Parse the date strings into Date objects
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }
    
    const dateArray: string[] = [];
    let currentDate = startDate;
    
    // Include both start and end dates in the array
    while (isBefore(currentDate, endDate) || isEqual(currentDate, endDate)) {
      dateArray.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = addDays(currentDate, 1);
    }
    
    return dateArray;
  } catch (error) {
    console.error('Error generating days between dates:', error);
    return [];
  }
};

// Calculate the number of days between two dates
export const calculateDurationInDays = (startDateStr?: string, endDateStr?: string): number => {
  if (!startDateStr || !endDateStr) return 0;
  
  try {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
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
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
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
