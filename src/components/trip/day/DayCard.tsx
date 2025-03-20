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

  const handleEdit = () => {
    console.log("Edit DayCard", id);
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-lg mb-6">
      {/* 
        Outer container ensures a fixed height for the “card.”
        The image is placed absolutely with a lower z-index. 
      */}
      <div className="relative w-full h-[600px]">
        {/* Background image behind everything (z-0). */}
        <DayImage
          dayId={id}
          title={title}
          imageUrl={imageUrl}
          defaultImageUrl={defaultImageUrl}
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
        />

        {/* DayHeader absolutely positioned at the top (z-30). */}
        <div className="absolute top-0 left-0 right-0 z-30">
          <DayHeader
            title={dayTitle}
            date={date}
            isOpen={isExpanded}
            onEdit={handleEdit}
            onDelete={() => onDelete(id)}
            onToggle={() => setIsExpanded((prev) => !prev)}
          />
        </div>

        {/* Collapsible content has a slightly lower z-index than the header, 
            but higher than the image, so it’s visible in front of the image. */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent
            className="
              relative
              z-20
              max-h-[600px]
              overflow-y-auto
              pt-20   /* Enough padding so it sits below the header */
          "
          >
            <div className="grid grid-cols-2 gap-4 p-4">
              <div className="space-y-4">
                {/* Hotel / Stay Section */}
                <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Stay</h3>
                  {hotelStays.map((stay) => (
                    <div key={stay.stay_id} className="text-white">
                      <p className="font-medium">{stay.hotel}</p>
                      <p className="text-sm">{stay.hotel_address}</p>
                    </div>
                  ))}
                </div>

                {/* Transport Section */}
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
                          <p className="text-sm text-white/70">{reservation.time}</p>
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
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export default DayCard;
