import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TimelineEvent {
  id: string;
  trip_id: string;
  date: string;
  title: string;
  description: string | null;
  image_url: string | null;
  hotel: string | null;
  hotel_details: string | null;
  order_index: number;
}

interface CreateTimelineEventInput {
  trip_id: string;
  date: string;
  title: string;
  description?: string;
  image_url?: string;
  hotel?: string;
  hotel_details?: string;
  order_index: number;
}

export const useTimelineEvents = (tripId: string) => {
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ['timeline-events', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timeline_events')
        .select('*, activities(*)')
        .eq('trip_id', tripId)
        .order('order_index');

      if (error) throw error;
      return data;
    },
  });

  const generateContent = async (destination: string, date: string, description?: string) => {
    const { data, error } = await supabase.functions.invoke('generate-trip-content', {
      body: { destination, date, description },
    });

    if (error) throw error;
    return data;
  };

  const createEvent = useMutation({
    mutationFn: async (input: CreateTimelineEventInput) => {
      try {
        // Generate AI content for the event
        const content = await generateContent(input.title, input.date, input.description);
        
        const { data, error } = await supabase
          .from('timeline_events')
          .insert([{ ...input, description: content.description }])
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error creating event:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline-events', tripId] });
      toast.success('Event created successfully');
    },
    onError: (error) => {
      console.error('Error:', error);
      toast.error('Failed to create event');
    },
  });

  const updateEvent = useMutation({
    mutationFn: async (event: Partial<TimelineEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('timeline_events')
        .update(event)
        .eq('id', event.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline-events', tripId] });
      toast.success('Event updated successfully');
    },
    onError: (error) => {
      console.error('Error:', error);
      toast.error('Failed to update event');
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('timeline_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline-events', tripId] });
      toast.success('Event deleted successfully');
    },
    onError: (error) => {
      console.error('Error:', error);
      toast.error('Failed to delete event');
    },
  });

  return {
    events,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
  };
};