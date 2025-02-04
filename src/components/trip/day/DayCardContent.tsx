import React from 'react';
import ActivitiesList from '../ActivitiesList';
import DiningList from '../DiningList';

interface DayCardContentProps {
  index: number;
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
  onAddActivity: () => void;
  onEditActivity: (id: string) => void;
  formatTime: (time?: string) => string;
  dayId: string;
}

const DayCardContent: React.FC<DayCardContentProps> = ({
  activities,
  onAddActivity,
  onEditActivity,
  formatTime,
  dayId,
}) => {
  return (
    <div className="space-y-6 p-6">
      <ActivitiesList
        activities={activities}
        onAddActivity={onAddActivity}
        onEditActivity={onEditActivity}
        formatTime={formatTime}
      />
      <DiningList
        reservations={[]}
        formatTime={formatTime}
        dayId={dayId}
      />
    </div>
  );
};

export default DayCardContent;