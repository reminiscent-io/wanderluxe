import React from 'react';
import { format, isValid, parseISO } from 'date-fns';

interface TripDateDisplayProps {
  label: string;
  date?: string | null;
}

const TripDateDisplay: React.FC<TripDateDisplayProps> = ({ label, date }) => {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Not set';

    try {
      const parsedDate = parseISO(dateString);

      if (!isValid(parsedDate)) {
        return 'Invalid date';
      }

      return format(parsedDate, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Date format error';
    }
  };

  return (
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-medium">{formatDate(date)}</div>
    </div>
  );
};

export default TripDateDisplay;