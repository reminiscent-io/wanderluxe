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
import EditActivityDialog from './activities/EditActivityDialog';

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
  const [editingActivity, setEditingActivity] = useState<DayActivity | null>(null);
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

  // Update the edit handler to accept the full activity object.
  const handleEditActivity = (activity: DayActivity) => {
    console.log("DayCard handleEditActivity called with activity:", activity);
    if (!activity.id) {
      console.error("Activity id is missing for the selected activity", activity);
      toast.error("This activity hasn't been saved yet. Please save it before editing.");
      return;
    }
    setEditingActivity(activity);
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
    if (editingActivity && editingActivity.id) {
      try {
        await activityManager.handleEditActivity(editingActivity.id, updatedActivity);
        toast.success('Activity updated successfully');
        setEditingActivity(null);
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
          hotelDetails={undefined}
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

      {editingActivity && editingActivityData && (
        <EditActivityDialog
          activityId={editingActivity.id}
          onOpenChange={(open) => {
            if (!open) {
              setEditingActivity(null);
              setEditingActivityData(null);
            }
          }}
          activity={editingActivityData}
          onActivityChange={(newData) => setEditingActivityData(newData)}
          onSubmit={handleActivityEditSubmit}
          eventId={editingActivity.id}
        />
      )}
    </>
  );
};

export default DayCard;
