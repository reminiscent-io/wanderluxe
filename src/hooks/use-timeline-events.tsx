import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface AccommodationDay {
  day_id: string;
  date: string;
}

interface BaseAccommodation {
  stay_id: string;
  trip_id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  hotel?: string | null;
  hotel_details?: string | null;
  created_at: string;
  order_index: number;
}

interface Accommodation extends BaseAccommodation {
  hotel_checkin_date: string | null;
  hotel_checkout_date: string | null;
  hotel_url: string | null;
  currency: string | null;
  expense_type: string | null;
  expense_cost: number | null;
  expense_paid: boolean;
  hotel_address: string | null;
  hotel_phone: string | null;
  hotel_place_id: string | null;
  hotel_website: string | null;
  final_accommodation_day: string | null;
  accommodations_days?: AccommodationDay[];
}

export const useTimelineEvents = (tripId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel('timeline-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accommodations',
          filter: `trip_id=eq.${tripId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['timeline-events', tripId] });
          queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_days',
          filter: `trip_id=eq.${tripId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  const { data: events = [], isLoading, refetch: refreshEvents } = useQuery({
    queryKey: ['timeline-events', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data: accommodations, error: accommodationsError } = await supabase
        .from('accommodations')
        .select('*, accommodations_days(day_id, date)')
        .eq('trip_id', tripId)
        .order('order_index');

      if (accommodationsError) throw accommodationsError;

      return (accommodations || []) as Accommodation[];
    },
    enabled: !!tripId,
  });

  const updateEvent = useMutation({
    mutationFn: async (event: Partial<Accommodation> & { stay_id: string }) => {
      const { data, error } = await supabase
        .from('accommodations')
        .update(event)
        .eq('stay_id', event.stay_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Event updated successfully');
      queryClient.invalidateQueries({ queryKey: ['timeline-events', tripId] });
    },
    onError: (error) => {
      console.error('Error:', error);
      toast.error('Failed to update event');
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      // First delete all accommodation_days
      const { error: daysError } = await supabase
        .from('accommodations_days')
        .delete()
        .eq('accommodation_id', eventId);

      if (daysError) throw daysError;

      // Then delete the accommodation
      const { error } = await supabase
        .from('accommodations')
        .delete()
        .eq('stay_id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Event deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['timeline-events', tripId] });
    },
    onError: (error) => {
      console.error('Error:', error);
      toast.error('Failed to delete event');
    },
  });

  return {
    events,
    isLoading,
    updateEvent,
    deleteEvent,
    refreshEvents,
  };
};
