import React from 'react';
import { formatDate } from '@/utils/dateUtils';

interface TripDateDisplayProps {
  label: string;
  date?: string | null;
}

const TripDateDisplay: React.FC<TripDateDisplayProps> = ({ label, date }) => {
  return (
    <div className="min-w-24">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-medium text-sm">
        {formatDate(date) || 'Not set'}
      </p>
    </div>
  );
};

export default TripDateDisplay;