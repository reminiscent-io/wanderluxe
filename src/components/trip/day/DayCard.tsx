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
      {/* Background Image Container */}
      <div className="relative h-[600px] w-full">
        <DayImage 
          dayId={id}
          title={title}
          imageUrl={imageUrl}
          defaultImageUrl={defaultImageUrl}
        />
      </div>

      {/* Header - Semi-transparent overlay */}
      <div className="absolute top-0 left-0 right-0 bg-black/10 backdrop-blur-sm p-4">
        <h2 className="text-2xl font-semibold text-white">{dayTitle}</h2>
        <p className="text-white/90">{formattedDate}</p>
      </div>

      {/* Content Container */}
      <div className="absolute inset-0 grid grid-cols-2 gap-4 p-4 pt-20">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Hotel Stay Section */}
          <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Stay</h3>
            {hotelStays.map(stay => (
              <div key={stay.stay_id} className="text-white">
                <p className="font-medium">{stay.hotel}</p>
                <p className="text-sm">{stay.hotel_address}</p>
              </div>
            ))}
          </div>

          {/* Transportation Section */}
          <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Flights and Transport</h3>
            {transportations.map((transport, idx) => (
              <div key={idx} className="text-white">
                <p className="font-medium">{transport.route}</p>
                <p className="text-sm">{transport.details}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Activities Section */}
          <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Activities</h3>
            <DayCardContent
              activities={activities}
              onAddActivity={() => {}}
              onEditActivity={() => {}}
              formatTime={(time) => time}
              dayId={id}
              eventId={null}
            />
          </div>

          {/* Reservations Section */}
          <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Reservations</h3>
            {reservations?.map((reservation, idx) => (
              <div key={idx} className="text-white">
                <p className="font-medium">{reservation.restaurant_name}</p>
                <p className="text-sm">{reservation.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayCard;