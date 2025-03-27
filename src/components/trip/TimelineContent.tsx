// TimelineContent.tsx
import React from 'react';
import DayCard from '../DayCard';

interface TimelineContentProps {
  days: any[];
  dayIndexMap: Map<string, number>;
  hotelStays: any[];
  transportations: any[]; // add this prop
  onDayDelete: (id: string) => void;
}

const TimelineContent: React.FC<TimelineContentProps> = ({
  days,
  dayIndexMap,
  hotelStays,
  transportations,
  onDayDelete,
}) => {
  return (
    <>
      {days.map((day) => (
        <DayCard
          key={day.day_id}
          id={day.day_id}
          tripId={day.trip_id}
          date={day.date}
          title={day.title}
          activities={day.activities}
          hotelStays={hotelStays}
          transportations={transportations}  {/* ensure transportations are passed */}
          onDelete={onDayDelete}
          index={dayIndexMap.get(day.day_id) || 0}
        />
      ))}
    </>
  );
};

export default TimelineContent;
