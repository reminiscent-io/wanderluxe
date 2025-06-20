import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HotelStay } from '@/types/trip';

export function useTimelineEvents(tripId: string) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ['accommodations', tripId],
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
      

      return data as HotelStay[];
    },
    enabled: !!tripId,
  });

  const refreshEvents = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Set up real-time subscription for accommodation changes - temporarily disabled for debugging
  useEffect(() => {
    if (!tripId) return;
    


    return () => {

    };
  }, [tripId]);

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
          checkin_time: data.checkin_time,
          checkout_time: data.checkout_time,
          cost: data.cost,
          currency: data.currency,
        })
        .eq('stay_id', data.id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Stay updated successfully');
      queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] });
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
      queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] });
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
