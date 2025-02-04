import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Edit, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DayHeader from './DayHeader';
import EditTitleDialog from './EditTitleDialog';
import ActivityDialogs from './ActivityDialogs';
import EventImage from './event/EventImage';
import DayCardContent from './day/DayCardContent';
import { useDayCardState } from './day/DayCardState';
import { useDayCardHandlers } from './day/DayCardHandlers';
import ImageUpload from '@/components/ImageUpload';
import { Skeleton } from "@/components/ui/skeleton";

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
  imageUrl?: string;
  onDelete: (id: string) => void;
}

const DayCard: React.FC<DayCardProps> = ({
  id,
  date,
  title,
  activities,
  index,
  imageUrl,
  onDelete
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
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
    const [hours, minutes] = time.split(':');
    const timeDate = new Date();
    timeDate.setHours(parseInt(hours), parseInt(minutes));
    return timeDate.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    }).toLowerCase();
  };

  const handleImageUpload = async (url: string) => {
    try {
      const { error } = await supabase
        .from('trip_days')
        .update({ image_url: url })
        .eq('id', id);

      if (error) throw error;
      setCurrentImageUrl(url);
    } catch (error) {
      console.error('Error updating day image:', error);
      toast.error('Failed to update day image');
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
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white/90"
            onClick={() => setIsEditMode(true)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <DayHeader
            date={date}
            dayNumber={index + 1}
            onEdit={() => setIsEditing(true)}
            onDelete={handleDeleteDay}
          />
        </div>
        
        <div className="grid md:grid-cols-2 h-full">
          {currentImageUrl ? (
            <EventImage
              title={title || `Day ${index + 1}`}
              imageUrl={currentImageUrl}
            />
          ) : (
            <div className="h-64 bg-gray-100 animate-pulse" />
          )}
          
          <DayCardContent
            index={index}
            title={title || ""}
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

      <Dialog open={isEditMode} onOpenChange={setIsEditMode}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Day {index + 1}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Day Image</h3>
              <ImageUpload
                onImageUpload={handleImageUpload}
                currentImageUrl={currentImageUrl}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Day Title</h3>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter a title for this day"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
      />
    </motion.div>
  );
};

export default DayCard;