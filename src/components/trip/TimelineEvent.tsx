
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import DayImage from './day/DayImage';
import EventEditDialog from './event/EventEditDialog';
import { useEventState } from './event/useEventState';
import { useEventHandlers } from './event/useEventHandlers';
import { DayActivity, ActivityFormData } from '@/types/trip';

interface TimelineEventProps {
  id: string;
  date: string;
  title: string;
  description: string;
  image: string;
  hotel: string;
  hotel_details: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  hotel_url: string;
  activities: DayActivity[];
  index: number;
  tripId: string;
  onEdit: (id: string, data: any) => void;
  onDelete: (id: string) => void;
}

const TimelineEvent: React.FC<TimelineEventProps> = ({ 
  id,
  date, 
  title, 
  description, 
  image, 
  hotel, 
  hotel_details,
  hotel_checkin_date,
  hotel_checkout_date,
  hotel_url,
  activities,
  index,
  tripId,
  onEdit,
  onDelete
}) => {
  const {
    isEditing,
    setIsEditing,
    editData,
    setEditData,
  } = useEventState({
    date,
    title,
    description,
    hotel,
    hotelDetails: hotel_details,
    hotelCheckinDate: hotel_checkin_date,
    hotelCheckoutDate: hotel_checkout_date,
    hotelUrl: hotel_url
  });

  const {
    handleEdit,
  } = useEventHandlers(id, tripId, onEdit, editData, activities);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.2 }}
      viewport={{ once: true }}
      className="group"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2">
            <DayImage 
              title={title} 
              imageUrl={image} 
              dayId={id}
              defaultImageUrl={undefined}
            />
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">{title}</h3>
              {description && <p className="text-gray-600 mb-4">{description}</p>}
              {hotel && (
                <div className="mb-4">
                  <h4 className="font-medium">Accommodation</h4>
                  <p>{hotel}</p>
                  {hotel_details && <p className="text-sm text-gray-600">{hotel_details}</p>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <EventEditDialog
        isOpen={isEditing}
        onOpenChange={setIsEditing}
        editData={editData}
        onEditDataChange={setEditData}
        onSubmit={handleEdit}
      />
    </motion.div>
  );
};

export default TimelineEvent;
