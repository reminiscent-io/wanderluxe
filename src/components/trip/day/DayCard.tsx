import React from 'react';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import DayHeader from './DayHeader';
import EditTitleDialog from './EditTitleDialog';
import ActivityDialogs from './ActivityDialogs';
import DayLayout from './DayLayout';
import { useDayCardState } from './DayCardState';
import { useDayCardHandlers } from './DayCardHandlers';

interface DayCardProps {
  id: string;
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
  onDelete: (id: string) => void;
  imageUrl?: string | null;
  defaultImageUrl?: string;
}

const DayCard: React.FC<DayCardProps> = ({
  id,
  date,
  title,
  activities,
  index,
  hotelDetails,
  onDelete,
  imageUrl,
  defaultImageUrl
}) => {
  const {
    isEditing,
    setIsEditing,
    editTitle,
    setEditTitle,
    isAddingActivity,
    setIsAddingActivity,
    editingActivity,
    setEditingActivity,
    newActivity,
    setNewActivity,
    activityEdit,
    setActivityEdit,
  } = useDayCardState(title);

  const { handleUpdateTitle, handleDeleteDay } = useDayCardHandlers(id, onDelete);

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
      <Card className="overflow-hidden">
        <DayHeader
          date={date}
          dayNumber={index + 1}
          onEdit={() => setIsEditing(true)}
          onDelete={handleDeleteDay}
          dayId={id}
          title={title}
          activities={activities}
          formatTime={formatTime}
        />
        
        <DayLayout
          title={title || ""}
          activities={activities}
          hotelDetails={hotelDetails}
          index={index}
          onAddActivity={() => setIsAddingActivity(true)}
          onEditActivity={(id) => {
            const activity = activities.find(a => a.id === id);
            if (activity) {
              setActivityEdit({
                text: activity.title,
                cost: activity.cost?.toString() || "",
                currency: activity.currency || "USD"
              });
              setEditingActivity(id);
            }
          }}
          formatTime={formatTime}
          dayId={id}
          imageUrl={imageUrl || defaultImageUrl} // Use defaultImageUrl if imageUrl is not provided
        />
      </Card>

      <EditTitleDialog
        isOpen={isEditing}
        onOpenChange={setIsEditing}
        title={editTitle}
        onTitleChange={setEditTitle}
        onSave={async () => {
          const success = await handleUpdateTitle(editTitle);
          if (success) setIsEditing(false);
        }}
      />

      <ActivityDialogs
        isAddingActivity={isAddingActivity}
        setIsAddingActivity={setIsAddingActivity}
        editingActivity={editingActivity}
        setEditingActivity={setEditingActivity}
        newActivity={newActivity}
        setNewActivity={setNewActivity}
        activityEdit={activityEdit}
        setActivityEdit={setActivityEdit}
        onAddActivity={() => {}}
        onEditActivity={() => {}}
        eventId={id}
      />
    </motion.div>
  );
};

export default DayCard;
