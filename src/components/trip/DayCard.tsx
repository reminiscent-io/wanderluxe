import React from 'react';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import HotelInfo from './HotelInfo';
import ActivitiesList from './ActivitiesList';

interface DayCardProps {
  date: string;
  title?: string;
  description?: string;
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
  index: number;
  hotelDetails?: {
    name: string;
    details: string;
    imageUrl?: string;
  };
}

const DayCard: React.FC<DayCardProps> = ({
  date,
  title,
  activities,
  onAddActivity,
  index,
  hotelDetails
}) => {
  const formatTime = (time?: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="space-y-4"
    >
      <div className="text-center text-sm font-medium text-earth-500 mb-2">
        {new Date(date).toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-3 h-full">
          <div className="h-64 md:h-full relative">
            <img
              src="https://images.unsplash.com/photo-1533606688076-b6683a5f59f1?auto=format&fit=crop&w=800&q=80"
              alt="Positano coastal view"
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="col-span-2 p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold mb-2">Day {index + 1}{title && `: ${title}`}</h3>
              </div>

              {hotelDetails && (
                <HotelInfo
                  name={hotelDetails.name}
                  details={hotelDetails.details}
                />
              )}

              <ActivitiesList
                activities={activities}
                onAddActivity={onAddActivity}
                onEditActivity={() => {}}
                formatTime={formatTime}
              />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default DayCard;