import React, { useState } from 'react';
import { Collapsible } from "@/components/ui/collapsible";
import DayHeader from './DayHeader';
import DayCollapsibleContent from './components/DayCollapsibleContent';
import DayActivityManager from './components/DayActivityManager';
import { format, parseISO } from 'date-fns';
import { DayActivity, ActivityFormData } from '@/types/trip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DayEditDialog from './DayEditDialog';
import EditActivityDialog from './EditActivityDialog';  // Updated import path

interface DayCardProps {
  id: string;
  tripId: string;
  date: string;
  title?: string;
  activities?: DayActivity[];
  imageUrl?: string | null;
  index: number;
  onDelete: (id: string) => void;
  defaultImageUrl?: string;
}

const DayCard: React.FC<DayCardProps> = ({ 
  id,
  tripId,
  date,
  title,
  activities = [],
  imageUrl,
  index,
  onDelete,
  defaultImageUrl
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingDay, setIsEditingDay] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivityData, setEditingActivityData] = useState<ActivityFormData | null>(null);
  const queryClient = useQueryClient();

  // Fetch restaurant reservations for this day
  const { data: reservations } = useQuery({
    queryKey: ['reservations', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_reservations')
        .select('*')
        .eq('day_id', id)
        .order('order_index');

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const dayTitle = title || format(parseISO(date), 'EEEE');

  const formatTime = (time?: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  // Get activity manager functions
  const activityManager = DayActivityManager({ 
    id, 
    tripId, 
    activities 
  });

  // When an activity is clicked for editing, find its data and open the edit dialog.
  const handleEditActivity = (activityId: string) => {
    console.log("DayCard handleEditActivity called with ID:", activityId);
    const activity = activities.find(act => act.id === activityId);
    if (!activity) {
      console.error("Activity not found for ID:", activityId);
      return;
    }
    setEditingActivityId(activityId);
    setEditingActivityData({
      title: activity.title,
      description: activity.description || '',
      start_time: activity.start_time || '',
      end_time: activity.end_time || '',
      cost: activity.cost ? String(activity.cost) : '',
      currency: activity.currency || ''
    });
  };

  // Handle submission from the EditActivityDialog.
  const handleActivityEditSubmit = async (updatedActivity: ActivityFormData) => {
    if (editingActivityId) {
      try {
        await activityManager.handleEditActivity(editingActivityId, updatedActivity);
        toast.success('Activity updated successfully');
        setEditingActivityId(null);
        setEditingActivityData(null);
        queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });
      } catch (error) {
        console.error('Error updating activity:', error);
        toast.error('Failed to update activity');
      }
    }
  };

  const handleDayUpdate = async (updatedData: { title?: string; imageUrl?: string }) => {
    try {
      const { error } = await supabase
        .from('trip_days')
        .update({
          title: updatedData.title,
          image_url: updatedData.imageUrl
        })
        .eq('day_id', id);

      if (error) throw error;

      toast.success('Day updated successfully');
      queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });
      setIsEditingDay(false);
    } catch (error) {
      console.error('Error updating day:', error);
      toast.error('Failed to update day');
      throw error;
    }
  };

  return (
    <>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="rounded-lg overflow-hidden bg-white shadow-md"
      >
        <DayHeader
          title={dayTitle}
          date={date}
          isOpen={isOpen}
          onEdit={() => setIsEditingDay(true)}
          onDelete={() => onDelete(id)}
        />

        <DayCollapsibleContent
          title={dayTitle}
          activities={activities}
          index={index}
          onAddActivity={activityManager.handleAddActivity}
          onEditActivity={handleEditActivity}
          formatTime={formatTime}
          dayId={id}
          tripId={tripId}
          imageUrl={imageUrl}
          defaultImageUrl={defaultImageUrl}
          reservations={reservations}
        />
      </Collapsible>

      <DayEditDialog
        open={isEditingDay}
        onOpenChange={setIsEditingDay}
        initialTitle={title || ''}
        initialImageUrl={imageUrl || ''}
        onSave={handleDayUpdate}
      />

      {editingActivityId && editingActivityData && (
        <EditActivityDialog
          activityId={editingActivityId}
          onOpenChange={(open) => {
            if (!open) {
              setEditingActivityId(null);
              setEditingActivityData(null);
            }
          }}
          activity={editingActivityData}
          onActivityChange={(newData) => setEditingActivityData(newData)}
          onSubmit={handleActivityEditSubmit}
          eventId={editingActivityId}
        />
      )}
    </>
  );
};

export default DayCard;
