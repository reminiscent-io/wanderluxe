import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import DayHeader from './day/DayHeader';
import EditTitleDialog from './day/EditTitleDialog';
import ActivityDialogs from './day/ActivityDialogs';
import EventImage from './event/EventImage';
import DayContent from './day/DayContent';

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
}

const DayCard: React.FC<DayCardProps> = ({
  id,
  date,
  title,
  activities,
  index,
  hotelDetails,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title || '');
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState({ text: "", cost: "", currency: "USD" });
  const [activityEdit, setActivityEdit] = useState({ text: "", cost: "", currency: "USD" });

  const formatTime = (time?: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const handleUpdateTitle = async () => {
    try {
      const { error } = await supabase
        .from('trip_days')
        .update({ title: editTitle })
        .eq('id', id);

      if (error) throw error;
      toast.success('Day title updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating day title:', error);
      toast.error('Failed to update day title');
    }
  };

  const handleDeleteDay = async () => {
    try {
      const { error } = await supabase
        .from('trip_days')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Day deleted successfully');
      onDelete(id);
    } catch (error) {
      console.error('Error deleting day:', error);
      toast.error('Failed to delete day');
    }
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
          onEdit={() => setIsEditing(true)}
          onDelete={handleDeleteDay}
        />
        
        <div className="grid md:grid-cols-2 h-full">
          <EventImage
            title={title || "Positano"}
            imageUrl={hotelDetails?.imageUrl || ""}
          />
          
          <DayContent
            index={index}
            title={title || ""}
            hotelDetails={hotelDetails}
            activities={activities}
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
          />
        </div>
      </Card>

      <EditTitleDialog
        isOpen={isEditing}
        onOpenChange={setIsEditing}
        title={editTitle}
        onTitleChange={setEditTitle}
        onSave={handleUpdateTitle}
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
      />
    </motion.div>
  );
};

export default DayCard;