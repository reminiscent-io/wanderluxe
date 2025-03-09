import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { EditIcon, TrashIcon } from 'lucide-react';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import DayHeader from './DayHeader';
import DayCollapsibleContent from './components/DayCollapsibleContent';
import { DayActivity, ActivityFormData } from '@/types/trip';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DayActivityManager from './components/DayActivityManager';
import DayImage from './DayImage';
import DayImageEditDialog from './DayImageEditDialog';

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
  const [isEditingDayImage, setIsEditingDayImage] = useState(false);
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

  const handleEditImage = () => {
    setIsEditingDayImage(true);
  };

  const handleActivityClick = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      setEditingActivityId(activityId);
      setActivityEditData({
        title: activity.title,
        description: activity.description || '',
        start_time: activity.start_time || '',
        end_time: activity.end_time || '',
        cost: activity.cost ? activity.cost.toString() : '',
        currency: activity.currency || 'USD'
      });
    }
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded-md shadow-sm mb-4 bg-white"
    >
      <CollapsibleTrigger className="w-full text-left">
        <DayHeader
          date={date}
          title={title}
          index={index}
          onDelete={() => onDelete(id)}
        />
      </CollapsibleTrigger>

      <>
        <div className="grid md:grid-cols-2 gap-4 p-4">
          <div className="relative group h-full">
            <DayImage 
              dayId={id} 
              title={title || format(parseISO(date), 'EEEE')} 
              imageUrl={imageUrl}
              defaultImageUrl={defaultImageUrl}
              className="h-full rounded-md"
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

          <div className="flex flex-col">
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
          </div>
        </div>

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