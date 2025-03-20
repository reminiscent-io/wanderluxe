import React, { useState } from 'react';
import DayImage from './DayImage';
import DayCardContent from './DayCardContent';
import { format, parseISO } from 'date-fns';
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
        <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
          <div className="space-y-4">
            <DayCardContent
              index={index}
              title={dayTitle}
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
      </div>
    </div>
  );
};

export default DayCard;