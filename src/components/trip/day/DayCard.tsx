import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import DayHeader from './DayHeader';
import { Button } from '@/components/ui/button';
import { Pencil, Plus } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent } from '@radix-ui/react-collapsible';
import { DayActivity, HotelStay } from '@/types/trip';
import DayImage from './DayImage';
import DayCardContent from './DayCardContent';

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
  const [isExpanded, setIsExpanded] = useState(true);
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

  // Utility to format reservation times
  const formatTime = (time?: string) => {
    if (!time || typeof time !== 'string') return '';
    try {
      return format(parseISO(time), 'h:mm a');
    } catch (error) {
      console.error('Invalid time format:', time);
      return '';
    }
  };

  const handleEdit = () => {
    console.log("Edit DayCard", id);
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-lg mb-6">
      {/* Header stays at top, outside of collapsible */}
      <div className="z-30">
        <DayHeader
          title={dayTitle}
          date={date}
          isOpen={isExpanded}
          onEdit={handleEdit}
          onDelete={() => onDelete(id)}
          onToggle={() => setIsExpanded(prev => !prev)}
        />
      </div>

      {/* Collapsible content includes both the image and the overlay sections */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="max-h-[600px] overflow-y-auto">
          <div className="relative w-full h-[600px]">
            {/* Background image behind everything */}
            <DayImage
              dayId={id}
              title={title}
              imageUrl={imageUrl}
              defaultImageUrl={defaultImageUrl}
              className="absolute top-0 left-0 w-full h-full object-cover z-0"
            />

            {/* Overlay content */}
            <div className="relative z-10 w-full h-full p-4 grid grid-cols-2 gap-4">
              {/* Left column: Stay & Flights/Transport */}
              <div className="space-y-4">
                <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Stay</h3>
                  {hotelStays.map((stay) => (
                    <div key={stay.stay_id} className="text-white">
                      <p className="font-medium">{stay.hotel}</p>
                      <p className="text-sm">{stay.hotel_address}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Flights and Transport
                  </h3>
                  {transportations.map((transport, idx) => (
                    <div key={idx} className="text-white">
                      <p className="font-medium">{transport.route}</p>
                      <p className="text-sm">{transport.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column: Activities & Reservations */}
              <div className="space-y-4">
                {/* Activities */}
                <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Activities</h3>
                  <DayCardContent
                    index={0}
                    title={dayTitle}
                    activities={activities}
                    // Removed reservations prop so they don't show under Activities
                    onAddActivity={() => {}}
                    onEditActivity={() => {}}
                    formatTime={formatTime}
                    dayId={id}
                    eventId={id}
                  />
                </div>

                {/* Reservations */}
                <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Reservations</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {}}
                      className="text-white hover:bg-white/20"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {reservations?.map((reservation, idx) => (
                      <div
                        key={reservation.id || idx}
                        className="flex justify-between items-center p-3 bg-black/20 backdrop-blur-sm rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-white">{reservation.restaurant_name}</h4>
                          {reservation.reservation_time && (
                            <p className="text-sm text-white/70">
                              {formatTime(reservation.reservation_time)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {}}
                          className="text-white hover:bg-white/20"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default DayCard;
