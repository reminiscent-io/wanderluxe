import { parseISO, eachDayOfInterval, format } from 'date-fns';

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
import { addDays, parseISO, format } from 'date-fns';

export const getDaysBetweenDates = (startDate: string, endDate: string): string[] => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const days: string[] = [];
  
  let currentDate = start;
  while (currentDate <= end) {
    days.push(format(currentDate, 'yyyy-MM-dd'));
    currentDate = addDays(currentDate, 1);
  }
  
  return days;
};
