
import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { EditIcon, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import DayHeader from './DayHeader';
import DayCollapsibleContent from './components/DayCollapsibleContent';
import { DayActivity, ActivityFormData } from '@/types/trip';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DayActivityManager from './components/DayActivityManager';
import DayImage from './DayImage';
import DayImageEditDialog from './DayImageEditDialog.tsx';
import UnsplashImage from '@/components/UnsplashImage';

interface DayCardProps {
  id: string;
  tripId: string;
  date: string;
  title?: string;
  activities?: DayActivity[];
  imageUrl?: string | null;
  photographer?: string | null;
  unsplashUsername?: string | null;
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
  photographer,
  unsplashUsername,
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

  const handleEditImage = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      <CollapsibleTrigger asChild>
        <div className="relative flex justify-between items-center p-4 rounded-lg bg-background border hover:border-primary transition-colors">
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-medium text-lg">{dayTitle}</h3>
              <span className="ml-2 text-sm text-muted-foreground">
                {format(parseISO(date), 'MMM d')}
              </span>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          />
        </div>
      </CollapsibleTrigger>

      {/* Card Content Section */}
      <div className="p-4">
        {/* Image Section */}
        {imageUrl && (
          <div className="relative h-40 rounded-md overflow-hidden mb-4">
            {photographer && unsplashUsername ? (
              <UnsplashImage
                imageUrl={imageUrl}
                photographer={photographer}
                unsplashUsername={unsplashUsername}
                altText={dayTitle}
                className="h-full w-full object-cover"
              />
            ) : (
              <img 
                src={imageUrl} 
                alt={dayTitle} 
                className="h-full w-full object-cover" 
              />
            )}
            <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-4">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-white text-xl font-bold">{dayTitle}</h3>
                </div>
                <div 
                  onClick={handleEditImage}
                  className="text-white bg-black/50 rounded-full p-1 cursor-pointer"
                >
                  <EditIcon className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activities and Reservations Section */}
        <div className="grid md:grid-cols-1 gap-4">
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

        {/* Image Edit Dialog */}
        {isEditingDayImage && (
          <DayImageEditDialog
            dayId={id}
            tripId={tripId}
            currentImageUrl={imageUrl}
            onClose={() => setIsEditingDayImage(false)}
            photographer={photographer}
            unsplashUsername={unsplashUsername}
          />
        )}
      </div>
    </Collapsible>
  );
};

export default DayCard;
