import React from 'react';
import { format, parseISO } from 'date-fns';

interface TripDateDisplayProps {
  label: string;
  date: string | null | undefined;
}

const TripDateDisplay: React.FC<TripDateDisplayProps> = ({ label, date }) => {
  const formattedDate = React.useMemo(() => {
    console.log(`TripDateDisplay for ${label}:`, { date });
    if (!date) return 'Not set';

    try {
      const parsedDate = parseISO(date);
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Invalid date in TripDateDisplay for ${label}:`, date);
        return 'Invalid date';
      }
      return format(parsedDate, 'MMMM do, yyyy');
    } catch (error) {
      console.error(`Error formatting date in TripDateDisplay for ${label}:`, error);
      return 'Invalid date';
    }
  }, [date, label]);

  return (
    <div className="flex flex-col">
      <span className="text-xs text-earth-600 font-medium">{label}</span>
      <span className="text-sm font-medium">{formattedDate}</span>
      {!date && <span className="text-xs text-red-500">Please set a date</span>}
    </div>
  );
};

export default TripDateDisplay;