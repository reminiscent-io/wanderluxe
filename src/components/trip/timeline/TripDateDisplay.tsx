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
      // Ensure we're working with a string
      const dateStr = String(dateString).trim();

      // Skip empty strings
      if (!dateStr) return 'Not set';

      // Try to parse the date
      const parsedDate = parseISO(dateStr);

      // Validate the date
      if (!isValid(parsedDate)) {
        console.warn('Invalid date format:', dateStr);
        return 'Invalid date';
      }

      try {
        // Format the date
        return format(parsedDate, 'MMM dd, yyyy');
      } catch (formatError) {
        console.error('Error in format() function:', dateStr, formatError);
        return 'Date error';
      }
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return 'Invalid date';
    }
  };

  return (
    <div className="min-w-24">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="font-medium text-base sm:text-lg">
        {formatDate(date)}
      </p>
    </div>
  );
};

export default TripDateDisplay;