import React from 'react';
import DayImage from './DayImage';
import DayCardContent from './DayCardContent';

interface DayLayoutProps {
  title: string;
  activities: Array<{
    id: string;
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    currency?: string;
  }>;
  hotelDetails?: {
    name: string;
    details: string;
    imageUrl?: string;
  };
  index: number;
  onAddActivity: () => void;
  onEditActivity: (id: string) => void;
  formatTime: (time?: string) => string;
  dayId: string;
  imageUrl?: string | null;
  defaultImageUrl?: string;
}

const DayLayout: React.FC<DayLayoutProps> = ({
  title,
  activities,
  index,
  onAddActivity,
  onEditActivity,
  formatTime,
  dayId,
  imageUrl,
  defaultImageUrl,
}) => {
  return (
    <div className="grid md:grid-cols-2 h-full">
      <DayImage
        title={title}
        imageUrl={imageUrl || defaultImageUrl}
      />
      
      <DayCardContent
        index={index}
        title={title}
        activities={activities}
        onAddActivity={onAddActivity}
        onEditActivity={onEditActivity}
        formatTime={formatTime}
        dayId={dayId}
        eventId={dayId}
      />
    </div>
  );
};

export default DayLayout;