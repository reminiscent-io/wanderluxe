import React from 'react';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import HotelInfo from './HotelInfo';
import ActivitiesList from './ActivitiesList';
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

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
        <div className="grid md:grid-cols-2 h-full">
          <div className="h-64 md:h-full relative">
            <img
              src="https://images.unsplash.com/photo-1533606688076-b6683a5f59f1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3270&q=80"
              alt="Positano coastal view"
              className="w-full h-full object-cover"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-white/80 hover:bg-white/90"
              onClick={() => {}}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-6">
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
                onAddActivity={() => {}}
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