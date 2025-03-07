import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { DayActivity, ActivityFormData } from '@/types/trip';
import DayCardContent from './DayCardContent';
import DayImageEditDialog from './DayImageEditDialog';
// Import the DayImage component directly from its file path
import DayImage from './DayImage';

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

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className="border rounded-lg overflow-hidden bg-white shadow-sm"
    >
      <div className="flex flex-col">
        {/* Image section - contained to the top */}
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer relative h-[300px] overflow-hidden">
            <DayImage 
              dayId={id}
              title={dayTitle}
              imageUrl={imageUrl}
              defaultImageUrl={defaultImageUrl}
            />
          </div>
        </CollapsibleTrigger>

        {/* Content section */}
        <CollapsibleContent className="flex-1">
          <div className="p-4">
            <DayCardContent
              index={index}
              title={dayTitle}
              activities={activities}
              reservations={reservations}
              onAddActivity={activityManager.handleAddActivity}
              onEditActivity={(activityId) => {
                const activity = activities.find(a => a.id === activityId);
                if (activity) {
                  setEditingActivityId(activityId);
                  setActivityEditData({
                    title: activity.title || '',
                    description: activity.description || '',
                    start_time: activity.start_time || '',
                    end_time: activity.end_time || '',
                    cost: activity.cost ? activity.cost.toString() : '',
                    currency: activity.currency || 'USD'
                  });
                }
              }}
              formatTime={formatTime}
              dayId={id}
              eventId={id}
            />
          </div>
        </CollapsibleContent>
      </div>

      {isEditingDayImage && (
        <DayImageEditDialog
          dayId={id}
          tripId={tripId}
          currentImageUrl={imageUrl}
          onClose={() => setIsEditingDayImage(false)}
        />
      )}
    </Collapsible>
  );
};

export default DayCard;