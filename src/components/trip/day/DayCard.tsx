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
import { EditIcon } from 'lucide-react';
import DayImageEditDialog from './DayImageEditDialog';
import DayImage from './DayImage'; // Added import for DayImage

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
  const [isEditingDayImage, setIsEditingDayImage] = useState(false); // Added state for image editing
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

  const toggleCollapse = () => {
    setIsOpen(!isOpen);
  };

  const handleEdit = () => {
    // Open day edit form
    setIsEditing(true);
  };

  const handleEditImage = () => {
    // Open day image edit form
    setIsEditingDayImage(true);
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
        onEdit={handleEdit}
        onDelete={() => onDelete(id)}
      />

      <>
      <DayCollapsibleContent
        title={dayTitle}
        activities={activities}
        index={index}
        onAddActivity={activityManager.handleAddActivity}
        onEditActivity={handleActivityClick}
        formatTime={formatTime}
        dayId={id}
        tripId={tripId}
        imageUrl={imageUrl}
        defaultImageUrl={defaultImageUrl}
        reservations={reservations}
        onActivityClick={handleActivityClick}
      />
      <div className="flex-1 xl:max-w-[80%] relative group">
        <DayImage 
          dayId={id} 
          title={title || format(parseISO(date), 'EEEE')} 
          imageUrl={imageUrl}
          defaultImageUrl={defaultImageUrl}
        />
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleEditImage();
          }}
          className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Edit day image"
        >
          <EditIcon className="h-4 w-4" />
        </button>
      </div>

      {isEditing && (
        <DayEditDialog 
          dayId={id}
          tripId={tripId}
          date={date}
          title={title}
          onClose={() => setIsEditing(false)}
        />
      )}

      {isEditingDayImage && (
        <DayImageEditDialog
          dayId={id}
          tripId={tripId}
          currentImageUrl={imageUrl}
          onClose={() => setIsEditingDayImage(false)}
        />
      )}
    </>
    </Collapsible>
  );
};

export default DayCard;