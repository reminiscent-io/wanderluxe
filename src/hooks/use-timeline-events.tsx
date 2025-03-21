
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HotelStay } from '@/types/trip';

export function useTimelineEvents(tripId: string) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ['timeline-events', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await supabase
        .from('accommodations')
        .select('*')
        .eq('trip_id', tripId)
        .order('order_index');
      
      if (error) {
        console.error('Error fetching accommodations:', error);
        throw error;
      }
      
      console.log('Fetched accommodations data:', data);
      return data as HotelStay[];
    },
    enabled: !!tripId,
  });

  const refreshEvents = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['timeline-events', tripId] });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Set up real-time subscription for accommodation changes
  useEffect(() => {
    if (!tripId) return;
    
    const channel = supabase
      .channel('accommodation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accommodations',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          refreshEvents();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tripId, queryClient]);

  const updateEvent = useMutation({
    mutationFn: async (data: any) => {
      if (!data.id) throw new Error('No event ID provided');
      
      const { error } = await supabase
        .from('accommodations')
        .update({
          title: data.title,
          description: data.description,
          image_url: data.image_url,
          hotel: data.hotel,
          hotel_details: data.hotel_details,
          hotel_url: data.hotel_url,
          hotel_checkin_date: data.hotel_checkin_date,
          hotel_checkout_date: data.hotel_checkout_date,
        })
        .eq('stay_id', data.id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Stay updated successfully');
      queryClient.invalidateQueries({ queryKey: ['timeline-events', tripId] });
    },
    onError: (error) => {
      console.error('Error:', error);
      toast.error('Failed to update stay');
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
    refreshEvents,
    updateEvent,
    deleteEvent
  };
}
