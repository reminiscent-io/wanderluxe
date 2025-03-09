
import React, { useState } from 'react';
import { Collapsible } from "@/components/ui/collapsible";
import DayHeader from './DayHeader';
import DayCollapsibleContent from './components/DayCollapsibleContent';
import DayActivityManager from './components/DayActivityManager';
import { format, parseISO } from 'date-fns';
import { ActivityFormData, DayActivity } from '@/types/trip';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [activityEditData, setActivityEditData] = useState<ActivityFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD'
  });
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
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating day:', error);
      toast.error('Failed to update day');
      throw error;
    }
  };

  const handleActivityClick = (activity: DayActivity) => {
    // Prepare the activity data for the edit form
    setActivityEditData({
      title: activity.title || '',
      description: activity.description || '',
      start_time: activity.start_time || '',
      end_time: activity.end_time || '',
      cost: activity.cost ? activity.cost.toString() : '',
      currency: activity.currency || 'USD'
    });
    setEditingActivityId(activity.id);
  };

  const handleUpdateActivity = async () => {
    if (editingActivityId) {
      try {
        await activityManager.handleEditActivity(editingActivityId, activityEditData);
        setEditingActivityId(null);
        queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });
      } catch (error) {
        console.error('Error updating activity:', error);
        toast.error('Failed to update activity');
      }
    }
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="rounded-lg overflow-hidden bg-white shadow-md"
    >
      <DayHeader
        title={dayTitle}
        date={date}
        isOpen={isOpen}
        onEdit={() => setIsEditing(true)}
        onDelete={() => onDelete(id)}
      />

      <DayCollapsibleContent
        title={dayTitle}
        activities={activities}
        index={index}
        onAddActivity={activityManager.handleAddActivity}
        onEditActivity={activityManager.handleEditActivity}
        formatTime={formatTime}
        dayId={id}
        tripId={tripId}
        imageUrl={imageUrl}
        defaultImageUrl={defaultImageUrl}
        reservations={reservations}
        onActivityClick={handleActivityClick}
      />

      <DayEditDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        initialTitle={title || ''}
        initialImageUrl={imageUrl || ''}
        onSave={handleDayUpdate}
      />

      <EditActivityDialog
        activityId={editingActivityId}
        onOpenChange={() => setEditingActivityId(null)}
        activity={activityEditData}
        onActivityChange={setActivityEditData}
        onSubmit={handleUpdateActivity}
        eventId={id}
      />
    </Collapsible>
  );
};

export default DayCard;
