
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { Accommodation, AccommodationDay } from '@/types/trip';

// Define simpler types for the hook's internal use
type AccommodationWithDays = Omit<Accommodation, 'accommodations_days'> & {
  accommodations_days?: AccommodationDay[];
};

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

      return accommodations as AccommodationWithDays[];
    },
    enabled: !!tripId,
  });

  const updateEvent = useMutation({
    mutationFn: async (event: Partial<AccommodationWithDays> & { stay_id: string }) => {
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
