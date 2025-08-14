
import React, { useState } from 'react';
import { TripDay, HotelStay, ActivityFormData } from '@/types/trip';
import CompactDayCard from '../day/CompactDayCard';
import DayNavigator from './DayNavigator';
import AccommodationDialog from '@/components/trip/accommodation/AccommodationDialog';
import TransportationDialog from '@/components/trip/transportation/TransportationDialog';
import AddActivityDialog from '@/components/trip/day/activities/AddActivityDialog';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TimelineContentProps {
  days?: TripDay[];
  dayIndexMap: Map<string, number>;
  hotelStays: HotelStay[];
  onDayDelete: (id: string) => void;
  tripArrivalDate?: string;
  tripDepartureDate?: string;
}

const TimelineContent: React.FC<TimelineContentProps> = ({
  days = [],
  dayIndexMap,
  hotelStays,
  onDayDelete,
  tripArrivalDate,
  tripDepartureDate
}) => {
  const queryClient = useQueryClient();
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [accommodationOpen, setAccommodationOpen] = useState(false);
  const [transportationOpen, setTransportationOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [newActivity, setNewActivity] = useState<ActivityFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD',
  });
  
  if (!days.length) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <p className="text-gray-500">No days added yet. Start by setting your trip dates above.</p>
      </div>
    );
  }

  // Sort days by date
  const sortedDays = [...days].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const handleDialogSuccess = () => {
    // Refresh the trip data
    if (sortedDays.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['trip', sortedDays[0].trip_id] });
    }
    setSelectedDayId(null);
  };

  return (
    <div className="w-full overflow-x-hidden">
      {/* Sticky Day Navigator */}
      <DayNavigator days={sortedDays} />
      
      {/* Day Cards */}
      <div className="space-y-3 md:space-y-4 mt-4 px-3 md:px-0">
        {sortedDays.map((day, index) => {
          const dayIndex = dayIndexMap.get(day.day_id) || index + 1;
          
          return (
            <CompactDayCard
              key={day.day_id}
              id={day.day_id}
              tripId={day.trip_id}
              date={day.date}
              title={day.title}
              activities={day.activities || []}
              index={dayIndex}
              hotelStays={hotelStays.filter(stay => {
                if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
                
                const dayDate = new Date(day.date.split('T')[0]);
                const checkinDate = new Date(stay.hotel_checkin_date.split('T')[0]);
                const checkoutDate = new Date(stay.hotel_checkout_date.split('T')[0]);
                
                return dayDate >= checkinDate && dayDate <= checkoutDate;
              })}
              onActivityAdd={() => {
                setSelectedDayId(day.day_id);
                setActivityOpen(true);
              }}
              onHotelAdd={() => {
                setSelectedDayId(day.day_id);
                setAccommodationOpen(true);
              }}
              onTransportationAdd={() => {
                setSelectedDayId(day.day_id);
                setTransportationOpen(true);
              }}
              onReservationAdd={() => {
                // For now, we'll handle reservations through the sidebar
                toast.info('Please use the sidebar to add dining reservations');
              }}
            />
          );
        })}
      </div>
      
      {/* Dialogs */}
      {sortedDays.length > 0 && (
        <>
          <AccommodationDialog
            tripId={sortedDays[0].trip_id}
            open={accommodationOpen}
            onOpenChange={setAccommodationOpen}
            onSuccess={handleDialogSuccess}
          />
          
          <TransportationDialog
            tripId={sortedDays[0].trip_id}
            open={transportationOpen}
            onOpenChange={setTransportationOpen}
            onSuccess={handleDialogSuccess}
          />
          
          {selectedDayId && (
            <AddActivityDialog
              isOpen={activityOpen}
              onOpenChange={setActivityOpen}
              activity={newActivity}
              onActivityChange={setNewActivity}
              onSubmit={async () => {
                // Add the activity to the database
                try {
                  const { error } = await supabase
                    .from('day_activities')
                    .insert({
                      day_id: selectedDayId,
                      trip_id: sortedDays[0].trip_id,
                      title: newActivity.title,
                      description: newActivity.description || null,
                      start_time: newActivity.start_time || null,
                      end_time: newActivity.end_time || null,
                      cost: newActivity.cost ? parseFloat(newActivity.cost) : null,
                      currency: newActivity.currency || null,
                      order_index: 0,
                      is_paid: false
                    });
                    
                  if (error) throw error;
                  
                  toast.success('Activity added successfully');
                  setActivityOpen(false);
                  setNewActivity({
                    title: '',
                    description: '',
                    start_time: '',
                    end_time: '',
                    cost: '',
                    currency: 'USD',
                  });
                  handleDialogSuccess();
                } catch (error) {
                  console.error('Error adding activity:', error);
                  toast.error('Failed to add activity');
                }
              }}
              eventId={selectedDayId}
            />
          )}
        </>
      )}
    </div>
  );
};

export default TimelineContent;
