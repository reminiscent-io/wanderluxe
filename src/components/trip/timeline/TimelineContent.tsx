import React from 'react';
import { motion } from 'framer-motion';
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
        <motion.div
          key={`${group.hotel || 'standalone'}-${groupIndex}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: groupIndex * 0.1 }}
        >
          {group.hotel ? (
            <AccommodationGroup
              hotel={group.hotel}
              hotelDetails={group.hotelDetails}
              checkinDate={group.checkinDate!}
              checkoutDate={group.checkoutDate!}
            >
              {group.days.map((day, dayIndex) => (
                <DayCard
                  key={day.id}
                  id={day.id}
                  date={day.date.split('T')[0]} // Ensure we only use the date part
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
            <div className="space-y-6">
              {group.days.map((day, dayIndex) => (
                <DayCard
                  key={day.id}
                  id={day.id}
                  date={day.date.split('T')[0]} // Ensure we only use the date part
                  title={day.title}
                  description={day.description}
                  activities={day.activities || []}
                  onAddActivity={() => {}}
                  index={dayIndex}
                  onDelete={() => {}}
                />
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default TimelineContent;