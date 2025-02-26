
import React from 'react';
import { Card } from "@/components/ui/card";
import DayHeader from './DayHeader';
import DiningList from '../dining/DiningList';
import { DayActivity } from '@/types/trip';

interface DayContentProps {
  title: string;
  activities: DayActivity[];
  formatTime: (time?: string) => string;
  dayId: string;
}

const DayContent: React.FC<DayContentProps> = ({
  title,
  activities,
  formatTime,
  dayId,
}) => {
  return (
    <Card className="p-4">
      <DayHeader title={title} activities={activities} />
      <div className="mt-4">
        <DiningList
          reservations={[]}
          formatTime={formatTime}
          dayId={dayId}
        />
      </div>
    </Card>
  );
};

export default DayContent;
