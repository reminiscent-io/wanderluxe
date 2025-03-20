import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import DayImage from './DayImage';
import DayCardContent from './DayCardContent';
import { DayActivity, HotelStay } from '@/types/trip';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  hotelStays?: HotelStay[];
  transportations?: any[];
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
  defaultImageUrl,
  hotelStays = [],
  transportations = []
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditingDay, setIsEditingDay] = useState(false);
  const [editingActivity, setEditingActivity] = useState<DayActivity | null>(null);
  const [isExpanded, setIsExpanded] = useState(true); // Added collapse state
  const queryClient = useQueryClient();

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
  const formattedDate = format(parseISO(date), 'MMMM d, yyyy');

  const onEdit = () => {
    // Implement edit logic here
    console.log("Edit DayCard", id);
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-lg mb-6">
      <div className="relative h-[600px] w-full">
        <DayImage 
          dayId={id}
          title={title}
          imageUrl={imageUrl}
          defaultImageUrl={defaultImageUrl}
          className="object-cover"
        />
        <div className="absolute top-0 left-0 right-0 bg-black/30 backdrop-blur-sm p-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            <p className="text-white/90">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded && "transform rotate-180"
              )} />
            </Button>
          </div>
        </div>
        {isExpanded && (
          <div className="absolute inset-0 pt-16 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
            <div className="space-y-4">
              <DayCardContent
                index={index}
                title={title}
                activities={activities}
                reservations={reservations}
                hotelStays={hotelStays}
                transportations={transportations}
                onAddActivity={async () => {}}
                onEditActivity={() => {}}
                formatTime={(time) => time || ''}
                dayId={id}
                eventId={id}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayCard;