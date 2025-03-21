import React, { useState, useEffect } from 'react';
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
import DayEditDialog from './DayEditDialog';
import { toast } from 'sonner';

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
  originalImageUrl?: string | null; // Added originalImageUrl prop
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
  transportations = [],
  originalImageUrl, // Added originalImageUrl prop
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  // Initialize with originalImageUrl if available, then fallback to imageUrl, then null
  const [imageUrlState, setImageUrl] = useState(originalImageUrl || imageUrl || null);
  const queryClient = useQueryClient();
  
  // Update imageUrlState when originalImageUrl changes (from parent component)
  useEffect(() => {
    if (originalImageUrl) {
      setImageUrl(originalImageUrl);
      console.log("Updated imageUrlState from originalImageUrl:", originalImageUrl);
    }
  }, [originalImageUrl]);

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
    setIsEditing(true);
  };

  const handleSaveEdit = async (data) => {
    try {
      // Update local state immediately for better UX
      if (data.title) {
        setEditTitle(data.title);
      }

      // Update image URL locally
      if (data.image_url) {
        setImageUrl(data.image_url); // Update imageUrl state
      }

      // Save changes to the database
      console.log("Saving to database:", { id, title: data.title, image_url: data.image_url });
      
      const { error, data: updatedData } = await supabase
        .from('trip_days')
        .update({
          title: data.title,
          image_url: data.image_url
        })
        .eq('day_id', id)
        .select('*')
        .single();
      
      if (error) {
        console.error('Error saving day edit:', error);
        toast.error('Failed to save changes');
        throw error;
      } else {
        toast.success('Day updated successfully');
        console.log("Database updated successfully:", updatedData);
        
        // Update local state with the data from the database
        if (updatedData.image_url) {
          setImageUrl(updatedData.image_url);
        }
        
        // Invalidate the trip data query to refresh the data
        queryClient.invalidateQueries(['trip']);
      }

      // Close the dialog
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving day edit:', error);
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    if (!hours || !minutes) return '';
    return `${hours}:${minutes}`;
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-lg mb-6">
      <DayEditDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        dayId={id}
        currentTitle={title}
        onTitleChange={setEditTitle}
        onSave={handleSaveEdit}
      />

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
              imageUrl={imageUrlState} // Use imageUrlState
              defaultImageUrl={defaultImageUrl}
              className="absolute top-0 left-0 w-full h-full object-cover z-0"
            />

            {/* Overlay content */}
            <div className="relative z-10 w-full h-full p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Column: Stay & Flights/Transport */}
              <div className="space-y-4 order-1">
                <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Stay</h3>
                  <div className="space-y-2">
                    {hotelStays
                      .filter(stay => {
                        if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) {
                          return false;
                        }
                        
                        // Normalize dates by removing time portions to avoid timezone issues
                        const dayDateStr = date.split('T')[0];
                        const checkinDateStr = stay.hotel_checkin_date.split('T')[0];
                        const checkoutDateStr = stay.hotel_checkout_date.split('T')[0];
                        
                        // Create Date objects from normalized strings
                        const dayDate = new Date(dayDateStr);
                        const checkinDate = new Date(checkinDateStr);
                        const checkoutDate = new Date(checkoutDateStr);
                        
                        console.log(`Filtering hotel stays - Day: ${dayDateStr}, 
                          Hotel: ${stay.hotel}, 
                          Check-in: ${checkinDateStr}, 
                          Check-out: ${checkoutDateStr}`);
                        
                        // Include the day if it's on or after check-in and before check-out
                        return dayDate >= checkinDate && dayDate < checkoutDate;
                      })
                      .map((stay) => (
                        <div 
                          key={stay.stay_id || stay.id} 
                          className="flex justify-between items-center p-3
                                     bg-white/90 rounded-lg shadow-sm 
                                     hover:bg-white/100 cursor-pointer"
                          onClick={() => {}}
                        >
                          <div>
                            <h4 className="font-medium text-gray-700">{stay.hotel}</h4>
                            <p className="text-sm text-gray-500">{stay.hotel_address}</p>
                            {stay.hotel_checkin_date && stay.hotel_checkin_date.split('T')[0] === date.split('T')[0] && (
                              <div className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Check-in day
                              </div>
                            )}
                            {stay.hotel_checkout_date && stay.hotel_checkout_date.split('T')[0] === date.split('T')[0] && (
                              <div className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                Check-out day
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Edit logic would go here
                            }}
                            className="text-gray-600 hover:bg-gray-200 h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    {(!hotelStays || hotelStays.filter(stay => {
                      if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) {
                        return false;
                      }
                      
                      // Use the same date normalization approach for consistency
                      const dayDateStr = date.split('T')[0];
                      const checkinDateStr = stay.hotel_checkin_date.split('T')[0];
                      const checkoutDateStr = stay.hotel_checkout_date.split('T')[0];
                      
                      const dayDate = new Date(dayDateStr);
                      const checkinDate = new Date(checkinDateStr);
                      const checkoutDate = new Date(checkoutDateStr);
                      
                      return dayDate >= checkinDate && dayDate < checkoutDate;
                    }).length === 0) && (
                      <p className="text-white text-sm italic">No hotel stay for this day</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {}}
                      className="w-full bg-white/10 text-white hover:bg-white/20 mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Hotel Stay
                    </Button>
                  </div>
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

              {/* Column: Activities & Reservations */}
              <div className="space-y-4 order-2">
                {/* Activities */}
                <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Activities</h3>
                  <div className="space-y-2">
                    {activities.map((activity) => (
                      <div
                        key={activity.id || activity.title}
                        className="flex justify-between items-center p-3
                                   bg-white/90 rounded-lg shadow-sm 
                                   hover:bg-white/100 cursor-pointer"
                        onClick={() => {
                          console.log("Activity item clicked:", activity);
                          if (activity?.id) {
                            // Handle activity click
                          }
                        }}
                      >
                        <div>
                          <h4 className="font-medium text-gray-700">
                            {activity.title}
                          </h4>
                          {activity.start_time && (
                            <p className="text-sm text-gray-500">
                              {formatTime(activity.start_time)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Edit logic would go here
                          }}
                          className="text-gray-600 hover:bg-gray-200 h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!activities || activities.length === 0) && (
                      <p className="text-white text-sm italic">No activities for this day</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {}}
                      className="w-full bg-white/10 text-white hover:bg-white/20 mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Activity
                    </Button>
                  </div>
                </div>

                {/* Reservations */}
                <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Reservations</h3>
                  <div className="space-y-2">
                    {reservations?.map((reservation, idx) => (
                      <div
                        key={reservation.id || idx}
                        className="flex justify-between items-center p-3
                                   bg-white/90 rounded-lg shadow-sm 
                                   hover:bg-white/100 cursor-pointer"
                        onClick={() => {}}
                      >
                        <div>
                          <h4 className="font-medium text-gray-700">
                            {reservation.restaurant_name}
                          </h4>
                          {reservation.reservation_time && (
                            <p className="text-sm text-gray-500">
                              {formatTime(reservation.reservation_time)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Edit logic would go here
                          }}
                          className="text-gray-600 hover:bg-gray-200 h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!reservations || reservations.length === 0) && (
                      <p className="text-white text-sm italic">No reservations for this day</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {}}
                      className="w-full bg-white/10 text-white hover:bg-white/20 mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Reservation
                    </Button>
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
