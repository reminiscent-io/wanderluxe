import React from 'react';
import { format, parseISO } from 'date-fns';

interface TripDateDisplayProps {
  label: string;
  date: string | null | undefined;
}

const TripDateDisplay: React.FC<TripDateDisplayProps> = ({ label, date }) => {
  let formattedDate = 'Not set';

  try {
    if (date) {
      formattedDate = format(parseISO(date), 'MMM d, yyyy');
    }
  } catch (err) {
    console.error("Error formatting date:", err);
  }

  return (
    <div className="trip-date-display">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{formattedDate}</p>
    </div>
  );
};

export default TripDateDisplay;