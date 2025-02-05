import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { Accommodation } from '@/types/trip';

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
      
      const { data: accommodations, error } = await supabase
        .from('accommodations')
        .select('*')
        .eq('trip_id', tripId)
        .order('order_index');

      if (error) throw error;

      const processedEvents = accommodations.map(event => {
        const hotelStay = accommodations.find(e => 
          e.hotel && 
          e.hotel_checkin_date && 
          e.hotel_checkout_date &&
          new Date(event.date) >= new Date(e.hotel_checkin_date) && 
          new Date(event.date) <= new Date(e.hotel_checkout_date)
        );

        if (hotelStay && !event.hotel) {
          return {
            ...event,
            hotel: hotelStay.hotel,
            hotel_details: hotelStay.hotel_details,
            hotel_url: hotelStay.hotel_url,
            hotel_checkin_date: hotelStay.hotel_checkin_date,
            hotel_checkout_date: hotelStay.hotel_checkout_date
          };
        }

        return event;
      });

      return processedEvents as Accommodation[];
    },
    enabled: !!tripId,
  });

  const updateEvent = useMutation({
    mutationFn: async (event: Partial<Accommodation> & { id: string }) => {
      const { data, error } = await supabase
        .from('accommodations')
        .update(event)
        .eq('id', event.id)
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
      const { error } = await supabase
        .from('accommodations')
        .delete()
        .eq('id', eventId);

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