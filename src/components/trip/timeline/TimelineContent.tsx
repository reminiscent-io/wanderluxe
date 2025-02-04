import React from 'react';
import AccommodationGroup from '../accommodation/AccommodationGroup';
import DayCard from '../DayCard';
import { TripDay } from '@/types/trip';

interface TimelineContentProps {
  groups: Array<{
    hotel?: string;
    hotelDetails?: string;
    checkinDate?: string;
    checkoutDate?: string;
    days: TripDay[];
  }>;
}

const TimelineContent: React.FC<TimelineContentProps> = ({ groups }) => {
  return (
    <div className="space-y-12">
      {groups.map((group, groupIndex) => (
        group.hotel ? (
          <AccommodationGroup
            key={`${group.hotel}-${groupIndex}`}
            hotel={group.hotel}
            hotelDetails={group.hotelDetails}
            checkinDate={group.checkinDate!}
            checkoutDate={group.checkoutDate!}
          >
            {group.days.map((day, dayIndex) => (
              <DayCard
                key={day.id}
                id={day.id}
                date={day.date}
                title={day.title}
                description={day.description}
                activities={day.activities || []}
                onAddActivity={() => {}}
                index={dayIndex}
                onDelete={() => {}}
              />
            ))}
          </AccommodationGroup>
        ) : (
          <div key={`standalone-${groupIndex}`} className="space-y-6">
            {group.days.map((day, dayIndex) => (
              <DayCard
                key={day.id}
                id={day.id}
                date={day.date}
                title={day.title}
                description={day.description}
                activities={day.activities || []}
                onAddActivity={() => {}}
                index={dayIndex}
                onDelete={() => {}}
              />
            ))}
          </div>
        )
      ))}
    </div>
  );
};

export default TimelineContent;