
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
import { setJunctionTravelers } from '@/services/travelers';
import { WeatherData, getWeatherForDate, isToday } from '@/hooks/useWeather';

interface TimelineContentProps {
  days?: TripDay[];
  dayIndexMap: Map<string, number>;
  hotelStays: HotelStay[];
  onDayDelete: (id: string) => void;
  tripArrivalDate?: string;
  tripDepartureDate?: string;
  canEdit?: boolean;
  weather?: WeatherData;
  tripDestination?: string;
}

const EMPTY_ACTIVITY: ActivityFormData = {
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  cost: '',
  currency: 'USD',
};

function buildActivityFormData(activity: DayActivity, dayDate: string): ActivityFormData {
  return {
    title: activity.title,
    description: activity.description || '',
    start_time: activity.start_time ? activity.start_time.slice(0, 5) : '',
    end_time: activity.end_time ? activity.end_time.slice(0, 5) : '',
    cost: activity.cost ? String(activity.cost) : '',
    currency: activity.currency || 'USD',
    date: dayDate.split('T')[0],
    location_address: activity.location_address || null,
    location_place_id: activity.location_place_id || null,
    location_phone: activity.location_phone || null,
    location_website: activity.location_website || null,
    location_rating: activity.location_rating || null,
  };
}

function buildActivityPayload(form: ActivityFormData): Record<string, any> {
  return {
    title: form.title,
    description: form.description || null,
    start_time: form.start_time || null,
    end_time: form.end_time || null,
    cost: form.cost ? Number.parseFloat(form.cost) : null,
    currency: form.currency || null,
    location_address: form.location_address || null,
    location_place_id: form.location_place_id || null,
    location_phone: form.location_phone || null,
    location_website: form.location_website || null,
    location_rating: form.location_rating || null,
  };
}

function hotelStaysForDay(day: TripDay, hotelStays: HotelStay[]): HotelStay[] {
  return hotelStays.filter(stay => {
    if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
    const dayDate = new Date(day.date.split('T')[0]);
    const checkinDate = new Date(stay.hotel_checkin_date.split('T')[0]);
    const checkoutDate = new Date(stay.hotel_checkout_date.split('T')[0]);
    return dayDate >= checkinDate && dayDate <= checkoutDate;
  });
}

const TimelineContent: React.FC<TimelineContentProps> = ({
  days = [],
  dayIndexMap,
  hotelStays,
  tripArrivalDate,
  tripDepartureDate,
  canEdit = true,
  weather,
  tripDestination
}) => {
  const queryClient = useQueryClient();
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<string | undefined>(undefined);
  const [accommodationOpen, setAccommodationOpen] = useState(false);
  const [transportationOpen, setTransportationOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);

  const [editingActivity, setEditingActivity] = useState<DayActivity | null>(null);
  const [editingHotel, setEditingHotel] = useState<HotelStay | null>(null);
  const [editingTransportation, setEditingTransportation] = useState<Transportation | null>(null);
  const [editingReservation, setEditingReservation] = useState<RestaurantReservation | null>(null);

  const [newActivity, setNewActivity] = useState<ActivityFormData>({ ...EMPTY_ACTIVITY });
  const [activityEdit, setActivityEdit] = useState<ActivityFormData>({ ...EMPTY_ACTIVITY });

  if (!days.length) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <p className="text-muted-foreground">No days added yet. Start by setting your trip dates above.</p>
      </div>
    );
  }

  const sortedDays = [...days].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const tripId = sortedDays[0].trip_id;

  function invalidateTripQueries(): void {
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
  }

  function invalidateTripAndDayQueries(): void {
    invalidateTripQueries();
    queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });
  }

  const handleAccommodationSuccess = (): void => {
    invalidateTripQueries();
    queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] });
    setSelectedDayId(null);
  };

  const handleTransportationSuccess = (): void => {
    invalidateTripQueries();
    queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
    setSelectedDayId(null);
  };

  const handleActivityDialogClose = (): void => {
    setActivityOpen(false);
    setEditingActivity(null);
    setActivityEdit({ ...EMPTY_ACTIVITY });
    setSelectedDayId(null);
    setPreselectedDate(undefined);
  };

  const handleEditActivity = async (activity: ActivityFormData): Promise<void> => {
    if (!editingActivity?.id) return;
    try {
      const updateData = buildActivityPayload(activityEdit);

      if (activity?.date) {
        const { data: tripDay, error: dayError } = await supabase
          .from('trip_days')
          .select('day_id')
          .eq('trip_id', tripId)
          .eq('date', activity.date)
          .single();

        if (!dayError && tripDay) {
          updateData.day_id = tripDay.day_id;
        }
      }

      const { error } = await supabase
        .from('day_activities')
        .update(updateData)
        .eq('id', editingActivity.id);

      if (error) throw error;

      if (activityEdit.travelers && editingActivity.id) {
        await setJunctionTravelers("activity", tripId, editingActivity.id, activityEdit.travelers);
      }

      invalidateTripAndDayQueries();
      if (editingActivity.day_id) {
        queryClient.invalidateQueries({ queryKey: ['activities', editingActivity.day_id] });
      }

      setEditingActivity(null);
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Failed to update activity');
    }
  };

  const handleAddActivity = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('day_activities')
        .insert({
          day_id: selectedDayId,
          trip_id: tripId,
          ...buildActivityPayload(newActivity),
          order_index: 0,
          is_paid: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (newActivity.travelers && newActivity.travelers.length > 0 && data?.id) {
        await setJunctionTravelers("activity", tripId, data.id, newActivity.travelers);
      }

      setActivityOpen(false);
      setNewActivity({ ...EMPTY_ACTIVITY });

      invalidateTripAndDayQueries();
      if (selectedDayId) {
        queryClient.invalidateQueries({ queryKey: ['activities', selectedDayId] });
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
    }
  };

  const handleActivitySubmit = async (activity: ActivityFormData): Promise<void> => {
    if (editingActivity?.id) {
      await handleEditActivity(activity);
    } else {
      await handleAddActivity();
    }
    setSelectedDayId(null);
    setPreselectedDate(undefined);
  };

  const handleActivityDelete = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEditingActivity(null);

      invalidateTripAndDayQueries();
      if (editingActivity?.day_id) {
        queryClient.invalidateQueries({ queryKey: ['activities', editingActivity.day_id] });
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
    }
  };

  const handleAddReservation = async (data: any): Promise<void> => {
    if (!selectedDayId) return;
    try {
      const { error } = await supabase
        .from('reservations')
        .insert({
          ...data,
          day_id: selectedDayId,
          trip_id: tripId,
        });

      if (error) throw error;
      invalidateTripQueries();
      queryClient.invalidateQueries({ queryKey: ['reservations', tripId, selectedDayId] });
    } catch (error) {
      console.error('Error adding reservation:', error);
      toast.error('Failed to add reservation');
    }
  };

  const handleEditReservation = async (data: any): Promise<void> => {
    if (!editingReservation) return;
    try {
      const { error } = await supabase
        .from('reservations')
        .update(data)
        .eq('id', editingReservation.id);

      if (error) throw error;
      invalidateTripQueries();
      if (editingReservation.day_id) {
        queryClient.invalidateQueries({ queryKey: ['reservations', tripId, editingReservation.day_id] });
      }
    } catch (error) {
      console.error('Error updating reservation:', error);
      toast.error('Failed to update reservation');
    }
  };

  const handleReservationSubmit = async (data: any): Promise<void> => {
    if (editingReservation) {
      await handleEditReservation(data);
    } else {
      await handleAddReservation(data);
    }
    setReservationOpen(false);
    setEditingReservation(null);
    setSelectedDayId(null);
  };

  const handleReservationDelete = editingReservation ? async (): Promise<void> => {
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', editingReservation.id);

      if (error) throw error;

      setReservationOpen(false);
      setEditingReservation(null);

      invalidateTripQueries();
      if (editingReservation.day_id) {
        queryClient.invalidateQueries({ queryKey: ['reservations', tripId, editingReservation.day_id] });
      }

      setSelectedDayId(null);
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast.error('Failed to delete reservation');
    }
  } : undefined;

  return (
    <>
      {/* Day Cards */}
      <div className="space-y-2 sm:space-y-3 md:space-y-4 pb-20 md:pb-4 -mx-1 md:-mx-6 px-1 md:px-6 py-4 md:py-6 rounded-lg">
        {sortedDays.map((day, index) => {
          const dayIndex = dayIndexMap.get(day.day_id) || index + 1;
          const dayDate = day.date.split('T')[0];
          const dayWeather = getWeatherForDate(weather, dayDate);
          const isTodayDay = isToday(dayDate);

          return (
            <div key={day.day_id}>
              <CompactDayCard
                id={day.day_id}
                tripId={day.trip_id}
                date={day.date}
                title={day.title}
                activities={day.activities || []}
                index={dayIndex}
                weather={dayWeather}
                currentWeather={isTodayDay ? weather?.current : undefined}
              hotelStays={hotelStaysForDay(day, hotelStays)}
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
                setActivityEdit(buildActivityFormData(activity, day.date));
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
                setReservationOpen(true);
              }}
              canEdit={canEdit}
              />
            </div>
          );
        })}
      </div>

      {/* Dialogs */}
      <AccommodationDialog
        tripId={tripId}
        open={accommodationOpen}
        onOpenChange={(open) => {
          setAccommodationOpen(open);
          if (!open) setEditingHotel(null);
        }}
        initialData={editingHotel as any || undefined}
        onSuccess={handleAccommodationSuccess}
      />

      <TransportationDialog
        tripId={tripId}
        open={transportationOpen}
        onOpenChange={(open) => {
          setTransportationOpen(open);
          if (!open) setEditingTransportation(null);
        }}
        initialData={editingTransportation as any || undefined}
        onSuccess={handleTransportationSuccess}
      />

      <ActivityDialog
        isOpen={activityOpen || !!editingActivity}
        onOpenChange={(open) => {
          if (!open) handleActivityDialogClose();
        }}
        activity={editingActivity ? activityEdit : newActivity}
        onActivityChange={editingActivity ? setActivityEdit : setNewActivity}
        preselectedDate={editingActivity ? undefined : preselectedDate}
        onSubmit={handleActivitySubmit}
        onDelete={handleActivityDelete}
        eventId={editingActivity?.day_id || selectedDayId || ''}
        tripDates={tripArrivalDate && tripDepartureDate ? { arrival_date: tripArrivalDate, departure_date: tripDepartureDate } : undefined}
        tripId={tripId}
        activityId={editingActivity?.id || null}
        destination={tripDestination}
      />

      <RestaurantReservationDialog
        isOpen={reservationOpen}
        onOpenChange={(open) => {
          setReservationOpen(open);
          if (!open) {
            setEditingReservation(null);
            setSelectedDayId(null);
          }
        }}
        tripId={tripId}
        title={editingReservation ? "Edit Restaurant Reservation" : "Add Restaurant Reservation"}
        editingReservation={editingReservation || undefined}
        isSubmitting={false}
        onSubmit={handleReservationSubmit}
        onDelete={handleReservationDelete}
        tripArrivalDate={tripArrivalDate}
        tripDepartureDate={tripDepartureDate}
      />
    </>
  );
};

export default TimelineContent;
