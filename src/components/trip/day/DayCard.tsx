
import React from 'react';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import DayHeader from './DayHeader';
import EditTitleDialog from './EditTitleDialog';
import ActivityDialogs from './ActivityDialogs';
import DayLayout from './DayLayout';
import { useDayCardState } from './DayCardState';
import { useDayCardHandlers } from './DayCardHandlers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DayActivity } from '@/types/trip';

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    //Optional: Log the error to a service like Sentry or LogRocket
  }, [hasError]);

  if (hasError) {
    return <div>Something went wrong.</div>;
  }

  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      {children}
    </React.Suspense>
  );
};

interface DayCardProps {
  id: string;
  date: string;
  title?: string;
  description?: string;
  activities: DayActivity[];
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
  tripId: string;
  reservations?: Array<{
    id: string;
    day_id: string;
    restaurant_name: string;
    reservation_time?: string;
    number_of_people?: number;
    confirmation_number?: string;
    notes?: string;
    cost?: number;
    currency?: string;
    address?: string;
    phone_number?: string;
    website?: string;
    rating?: number;
    created_at: string;
    order_index: number;
  }>;
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
  defaultImageUrl,
  tripId,
  reservations
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

  const handleAddActivity = async () => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .insert([{
          day_id: id,
          title: newActivity.title,
          description: newActivity.description || '',
          start_time: newActivity.start_time,
          end_time: newActivity.end_time,
          cost: newActivity.cost ? Number(newActivity.cost) : null,
          currency: newActivity.currency,
          order_index: activities.length
        }]);

      if (error) throw error;
      toast.success('Activity added successfully');
      setIsAddingActivity(false);
      setNewActivity({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        cost: '',
        currency: 'USD'
      });
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
    }
  };

  const handleEditActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .update({
          title: activityEdit.title,
          description: activityEdit.description || '',
          start_time: activityEdit.start_time,
          end_time: activityEdit.end_time,
          cost: activityEdit.cost ? Number(activityEdit.cost) : null,
          currency: activityEdit.currency
        })
        .eq('id', activityId);

      if (error) throw error;
      toast.success('Activity updated successfully');
      setEditingActivity(null);
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Failed to update activity');
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
        <Collapsible defaultOpen={true}>
          <CollapsibleTrigger className="w-full">
            <div className="cursor-pointer">
              <DayHeader
                date={date}
                dayNumber={index + 1}
                onEdit={() => setIsEditing(true)}
                dayId={id}
                title={title}
                activities={activities}
                formatTime={formatTime}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4">
            <ErrorBoundary>
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
                      title: activity.title,
                      description: activity.description || '',
                      start_time: activity.start_time || '',
                      end_time: activity.end_time || '',
                      cost: activity.cost?.toString() || '',
                      currency: activity.currency || 'USD'
                    });
                    setEditingActivity(id);
                  }
                }}
                formatTime={formatTime}
                dayId={id}
                tripId={tripId}
                imageUrl={imageUrl || defaultImageUrl}
                reservations={reservations}
              />
            </ErrorBoundary>
          </CollapsibleContent>
        </Collapsible>
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
        onAddActivity={handleAddActivity}
        onEditActivity={handleEditActivity}
        eventId={id}
      />
    </motion.div>
  );
};

export default DayCard;
