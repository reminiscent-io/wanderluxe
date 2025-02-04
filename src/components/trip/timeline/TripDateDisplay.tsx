import React from 'react';
import { format, parseISO } from 'date-fns';

interface TripDateDisplayProps {
  label: string;
  date: string | null;
}

const TripDateDisplay = ({ label, date }: TripDateDisplayProps) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return format(parseISO(dateString), 'EEEE MMMM d, yyyy');
  };

  return (
    <div>
      <p className="text-sm text-gray-500 italic mb-1">{label}</p>
      <p className="font-medium">
        {formatDate(date)}
      </p>
    </div>
  );
};

export default TripDateDisplay;