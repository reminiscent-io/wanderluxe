
import React, { useState } from 'react';
import { TripDay, HotelStay, ActivityFormData, DayActivity, Transportation, RestaurantReservation } from '@/types/trip';
import CompactDayCard from '../day/CompactDayCard';
import AccommodationDialog from '@/components/trip/accommodation/AccommodationDialog';
import TransportationDialog from '@/components/trip/transportation/TransportationDialog';
import ActivityDialog from '@/components/trip/day/activities/ActivityDialog';
import RestaurantReservationDialog from '@/components/trip/dining/RestaurantReservationDialog';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { setDayActivityTravelers } from '@/services/travelers';

interface TimelineContentProps {
  days?: TripDay[];
  dayIndexMap: Map<string, number>;
  hotelStays: HotelStay[];
  onDayDelete: (id: string) => void;
  tripArrivalDate?: string;
  tripDepartureDate?: string;
  canEdit?: boolean;
}

const TimelineContent: React.FC<TimelineContentProps> = ({
  days = [],
  dayIndexMap,
  hotelStays,
  tripArrivalDate,
  tripDepartureDate,
  canEdit = true
}) => {
  const queryClient = useQueryClient();
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<string | undefined>(undefined);
  const [accommodationOpen, setAccommodationOpen] = useState(false);
  const [transportationOpen, setTransportationOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  
  // States for editing
  const [editingActivity, setEditingActivity] = useState<DayActivity | null>(null);
  const [editingHotel, setEditingHotel] = useState<HotelStay | null>(null);
  const [editingTransportation, setEditingTransportation] = useState<Transportation | null>(null);
  const [editingReservation, setEditingReservation] = useState<RestaurantReservation | null>(null);
  
  const [newActivity, setNewActivity] = useState<ActivityFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD',
  });
  
  const [activityEdit, setActivityEdit] = useState<ActivityFormData>({
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

  const handleAccommodationSuccess = () => {
    if (sortedDays.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['trip', sortedDays[0].trip_id] });
      queryClient.invalidateQueries({ queryKey: ['accommodations', sortedDays[0].trip_id] });
    }
    setSelectedDayId(null);
  };

  const handleTransportationSuccess = () => {
    if (sortedDays.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['trip', sortedDays[0].trip_id] });
      queryClient.invalidateQueries({ queryKey: ['transportation', sortedDays[0].trip_id] });
    }
    setSelectedDayId(null);
  };

  return (
    <>
      {/* Day Cards */}
      <div className="space-y-3 md:space-y-4">
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
                setPreselectedDate(day.date.split('T')[0]);
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
                setSelectedDayId(day.day_id);
                setReservationOpen(true);
              }}
              onActivityClick={(activity) => {
                setEditingActivity(activity);
                setActivityEdit({
                  title: activity.title,
                  description: activity.description || '',
                  start_time: activity.start_time ? activity.start_time.slice(0, 5) : '',
                  end_time: activity.end_time ? activity.end_time.slice(0, 5) : '',
                  cost: activity.cost ? String(activity.cost) : '',
                  currency: activity.currency || 'USD',
                  date: day.date.split('T')[0], // Add the current day's date
                });
                // Don't open the add dialog when editing
                setActivityOpen(false);
              }}
              onHotelClick={(hotel) => {
                setEditingHotel(hotel);
                setAccommodationOpen(true);
              }}
              onTransportationClick={(transportation) => {
                setEditingTransportation(transportation);
                setTransportationOpen(true);
              }}
              onReservationClick={(reservation) => {
                setEditingReservation(reservation);
                setReservationOpen(true);  // Open the dialog when clicking a reservation
              }}
              canEdit={canEdit}
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
            onOpenChange={(open) => {
              setAccommodationOpen(open);
              if (!open) setEditingHotel(null);
            }}
            initialData={editingHotel as any || undefined}
            onSuccess={handleAccommodationSuccess}
          />
          
          <TransportationDialog
            tripId={sortedDays[0].trip_id}
            open={transportationOpen}
            onOpenChange={(open) => {
              setTransportationOpen(open);
              if (!open) setEditingTransportation(null);
            }}
            initialData={editingTransportation as any || undefined}
            onSuccess={handleTransportationSuccess}
          />
          
          {/* Consolidated Activity Dialog - handles both add and edit */}
          <ActivityDialog
            isOpen={activityOpen || !!editingActivity}
            onOpenChange={(open) => {
              if (!open) {
                setActivityOpen(false);
                setEditingActivity(null);
                setActivityEdit({
                  title: '',
                  description: '',
                  start_time: '',
                  end_time: '',
                  cost: '',
                  currency: 'USD',
                });
                setSelectedDayId(null);
                setPreselectedDate(undefined);
              }
            }}
            activity={editingActivity ? activityEdit : newActivity}
            onActivityChange={editingActivity ? setActivityEdit : setNewActivity}
            preselectedDate={!editingActivity ? preselectedDate : undefined}
            onSubmit={async (activity) => {
              if (editingActivity?.id) {
                // Edit mode
                try {
                  const { error } = await supabase
                    .from('day_activities')
                    .update({
                      title: activityEdit.title,
                      description: activityEdit.description || null,
                      start_time: activityEdit.start_time || null,
                      end_time: activityEdit.end_time || null,
                      cost: activityEdit.cost ? parseFloat(activityEdit.cost) : null,
                      currency: activityEdit.currency || null,
                    })
                    .eq('id', editingActivity.id);
                  
                  if (error) throw error;
                  
                  // Save traveler tags if we have travelers selected
                  if (activityEdit.travelers && editingActivity?.id) {
                    await setDayActivityTravelers(sortedDays[0].trip_id, editingActivity.id, activityEdit.travelers);
                  }
                  
                  toast.success('Activity updated successfully');
                  
                  // Invalidate queries
                  if (sortedDays.length > 0) {
                    queryClient.invalidateQueries({ queryKey: ['trip', sortedDays[0].trip_id] });
                    queryClient.invalidateQueries({ queryKey: ['trip-days', sortedDays[0].trip_id] });
                  }
                  if (editingActivity?.day_id) {
                    queryClient.invalidateQueries({ queryKey: ['activities', editingActivity.day_id] });
                  }
                  
                  setEditingActivity(null);
                } catch (error) {
                  console.error('Error updating activity:', error);
                  toast.error('Failed to update activity');
                }
              } else {
                // Add mode
                try {
                  const { data, error } = await supabase
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
                    })
                    .select()
                    .single();
                    
                  if (error) throw error;
                  
                  // Save traveler tags if we have travelers selected
                  if (newActivity.travelers && newActivity.travelers.length > 0 && data?.id) {
                    await setDayActivityTravelers(sortedDays[0].trip_id, data.id, newActivity.travelers);
                  }
                  
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
                  
                  // Invalidate queries
                  if (sortedDays.length > 0) {
                    queryClient.invalidateQueries({ queryKey: ['trip', sortedDays[0].trip_id] });
                    queryClient.invalidateQueries({ queryKey: ['trip-days', sortedDays[0].trip_id] });
                  }
                  if (selectedDayId) {
                    queryClient.invalidateQueries({ queryKey: ['activities', selectedDayId] });
                  }
                } catch (error) {
                  console.error('Error adding activity:', error);
                  toast.error('Failed to add activity');
                }
              }
              setSelectedDayId(null);
              setPreselectedDate(undefined);
            }}
            onDelete={async (id) => {
              try {
                const { error } = await supabase
                  .from('day_activities')
                  .delete()
                  .eq('id', id);
                
                if (error) throw error;
                toast.success('Activity deleted successfully');
                setEditingActivity(null);
                
                // Invalidate queries
                if (sortedDays.length > 0) {
                  queryClient.invalidateQueries({ queryKey: ['trip', sortedDays[0].trip_id] });
                  queryClient.invalidateQueries({ queryKey: ['trip-days', sortedDays[0].trip_id] });
                }
                if (editingActivity?.day_id) {
                  queryClient.invalidateQueries({ queryKey: ['activities', editingActivity.day_id] });
                }
              } catch (error) {
                console.error('Error deleting activity:', error);
                toast.error('Failed to delete activity');
              }
            }}
            eventId={editingActivity?.day_id || selectedDayId || ''}
            tripDates={tripArrivalDate && tripDepartureDate ? { arrival_date: tripArrivalDate, departure_date: tripDepartureDate } : undefined}
            tripId={sortedDays[0].trip_id}
            activityId={editingActivity?.id || null}
          />
          
          {/* Restaurant Reservation Dialog - always available */}
          <RestaurantReservationDialog
            isOpen={reservationOpen}
            onOpenChange={(open) => {
              setReservationOpen(open);
              if (!open) {
                setEditingReservation(null);
                setSelectedDayId(null);
              }
            }}
            tripId={sortedDays[0].trip_id}
            title={editingReservation ? "Edit Restaurant Reservation" : "Add Restaurant Reservation"}
            editingReservation={editingReservation || undefined}
            isSubmitting={false}
            onSubmit={async (data) => {
              // Handle the submission with proper day_id
              if (!editingReservation && selectedDayId) {
                // Add new reservation
                try {
                  const { error } = await supabase
                    .from('reservations')
                    .insert({
                      ...data,
                      day_id: selectedDayId,
                      trip_id: sortedDays[0].trip_id
                    });
                  
                  if (error) throw error;
                  toast.success('Reservation added successfully');
                  
                  // Invalidate both trip and reservation queries for real-time updates
                  queryClient.invalidateQueries({ queryKey: ['trip', sortedDays[0].trip_id] });
                  queryClient.invalidateQueries({ queryKey: ['reservations', sortedDays[0].trip_id, selectedDayId] });
                } catch (error) {
                  console.error('Error adding reservation:', error);
                  toast.error('Failed to add reservation');
                }
              } else if (editingReservation) {
                // Update existing reservation
                try {
                  const { error } = await supabase
                    .from('reservations')
                    .update(data)
                    .eq('id', editingReservation.id);
                  
                  if (error) throw error;
                  toast.success('Reservation updated successfully');
                  
                  // Invalidate both trip and reservation queries for real-time updates
                  queryClient.invalidateQueries({ queryKey: ['trip', sortedDays[0].trip_id] });
                  if (editingReservation.day_id) {
                    queryClient.invalidateQueries({ queryKey: ['reservations', sortedDays[0].trip_id, editingReservation.day_id] });
                  }
                } catch (error) {
                  console.error('Error updating reservation:', error);
                  toast.error('Failed to update reservation');
                }
              }
              setReservationOpen(false);
              setEditingReservation(null);
              setSelectedDayId(null);
            }}
            onDelete={editingReservation ? async () => {
              try {
                const { error } = await supabase
                  .from('reservations')
                  .delete()
                  .eq('id', editingReservation.id);
                
                if (error) throw error;
                
                toast.success('Reservation deleted successfully');
                setReservationOpen(false);
                setEditingReservation(null);
                
                // Invalidate both trip and reservation queries for real-time updates
                queryClient.invalidateQueries({ queryKey: ['trip', sortedDays[0].trip_id] });
                if (editingReservation.day_id) {
                  queryClient.invalidateQueries({ queryKey: ['reservations', sortedDays[0].trip_id, editingReservation.day_id] });
                }
                
                setSelectedDayId(null);
              } catch (error) {
                console.error('Error deleting reservation:', error);
                toast.error('Failed to delete reservation');
              }
            } : undefined}
            tripArrivalDate={tripArrivalDate}
            tripDepartureDate={tripDepartureDate}
          />
        </>
      )}
    </>
  );
};

export default TimelineContent;
