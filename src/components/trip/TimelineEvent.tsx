import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import EventImage from './event/EventImage';
import EventContent from './event/EventContent';
import EventEditDialog from './event/EventEditDialog';
import { useEventState } from './event/useEventState';
import { useEventHandlers } from './event/useEventHandlers';

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
  activities: { id: string; text: string; cost?: number; currency?: string }[];
  index: number;
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
  onEdit,
  onDelete
}) => {
  const {
    isEditing,
    setIsEditing,
    editData,
    setEditData,
    newActivity,
    setNewActivity,
    isAddingActivity,
    setIsAddingActivity,
    editingActivity,
    setEditingActivity,
    activityEdit,
    setActivityEdit,
  } = useEventState(
    date,
    title,
    description,
    hotel,
    hotel_details,
    hotel_checkin_date,
    hotel_checkout_date,
    hotel_url
  );

  const {
    handleEdit,
    handleAddActivity,
    handleEditActivity,
  } = useEventHandlers(id, onEdit, editData, activities);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.2 }}
      viewport={{ once: true }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 gap-4">
            <EventImage title={title} imageUrl={image} />
            <EventContent
              date={date}
              title={title}
              description={description}
              hotel={hotel}
              hotelDetails={hotel_details}
              hotelUrl={hotel_url}
              hotelCheckinDate={hotel_checkin_date}
              hotelCheckoutDate={hotel_checkout_date}
              activities={activities}
              onEdit={() => setIsEditing(true)}
              isAddingActivity={isAddingActivity}
              onAddingActivityChange={setIsAddingActivity}
              newActivity={newActivity}
              onNewActivityChange={setNewActivity}
              handleAddActivity={() => handleAddActivity(newActivity)}
              editingActivity={editingActivity}
              onEditingActivityChange={setEditingActivity}
              activityEdit={activityEdit}
              onActivityEditChange={setActivityEdit}
              handleEditActivity={() => handleEditActivity(editingActivity!, activityEdit)}
            />
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