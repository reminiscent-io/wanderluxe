import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/types/database.types';

type DbAccommodationDay = Tables<'accommodations_days'>;

export function useTimelineEvents(tripId: string | undefined) {
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accommodations_days'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['timeline-events', tripId] });
          queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });
        }
      )
      .subscribe();

    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  const { data: events = [], isLoading, refetch: refreshEvents } = useQuery({
    queryKey: ['timeline-events', tripId],
    queryFn: async () => {
      if (!tripId) return [];

      // Fetch accommodations data with all associated days
      const { data: accommodations, error } = await supabase
        .from('accommodations')
        .select(`
          *,
          accommodations_days (
            id, 
            day_id, 
            date
          )
        `)
        .eq('trip_id', tripId)
        .order('order_index');

      if (error) {
        console.error("Error fetching accommodations:", error);
        throw error;
      }

      console.log("Fetched accommodations data:", accommodations);
      return accommodations || [];
    },
    enabled: !!tripId,
  });

  const updateEvent = useMutation({
    mutationFn: async () => {
      toast.error('Accommodation functionality has been removed');
      throw new Error('Accommodation functionality has been removed');
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
    mutationFn: async () => {
      toast.error('Accommodation functionality has been removed');
      throw new Error('Accommodation functionality has been removed');
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
    refreshEvents
  };
}