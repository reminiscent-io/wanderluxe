import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DayActivity {
  id: string;
  day_id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost?: number;
  currency?: string;
  order_index: number;
  created_at: string;
}

interface TripDay {
  id: string;
  trip_id: string;
  date: string;
  title?: string;
  description?: string;
  image_url?: string;
  created_at: string;
  activities: DayActivity[];
}

export const useTripDays = (tripId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: days, isLoading, refetch: refreshDays } = useQuery({
    queryKey: ['trip-days', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data: tripDays, error: daysError } = await supabase
        .from('trip_days')
        .select(`
          *,
          day_activities (*)
        `)
        .eq('trip_id', tripId)
        .order('date');

      if (daysError) {
        toast.error('Failed to load trip days');
        throw daysError;
      }

      return tripDays.map(day => ({
        ...day,
        activities: (day.day_activities || []).sort((a, b) => a.order_index - b.order_index)
      }));
    },
    enabled: !!tripId
  });

  const addDay = useMutation({
    mutationFn: async (newDay: { 
      tripId: string; 
      date: string; 
      title?: string;
      description?: string;
      image_url?: string;
    }) => {
      const { data, error } = await supabase
        .from('trip_days')
        .insert([{
          trip_id: newDay.tripId,
          date: newDay.date,
          title: newDay.title,
          description: newDay.description,
          image_url: newDay.image_url
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });
      toast.success('Day added successfully');
    },
    onError: () => {
      toast.error('Failed to add day');
    }
  });

  const updateDay = useMutation({
    mutationFn: async (updatedDay: {
      id: string;
      title?: string;
      description?: string;
      image_url?: string;
      date?: string;
    }) => {
      const { error } = await supabase
        .from('trip_days')
        .update({
          title: updatedDay.title,
          description: updatedDay.description,
          image_url: updatedDay.image_url,
          date: updatedDay.date
        })
        .eq('id', updatedDay.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });
      toast.success('Day updated successfully');
    },
    onError: () => {
      toast.error('Failed to update day');
    }
  });

  const addActivity = useMutation({
    mutationFn: async (newActivity: {
      dayId: string;
      title: string;
      description?: string;
      startTime?: string;
      endTime?: string;
      cost?: number;
      currency?: string;
      orderIndex: number;
    }) => {
      const { data, error } = await supabase
        .from('day_activities')
        .insert([{
          day_id: newActivity.dayId,
          title: newActivity.title,
          description: newActivity.description,
          start_time: newActivity.startTime,
          end_time: newActivity.endTime,
          cost: newActivity.cost,
          currency: newActivity.currency,
          order_index: newActivity.orderIndex
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });
      toast.success('Activity added successfully');
    },
    onError: () => {
      toast.error('Failed to add activity');
    }
  });

  const reorderActivities = useMutation({
    mutationFn: async ({ dayId, activities }: {
      dayId: string;
      activities: { id: string; order_index: number }[];
    }) => {
      const { error } = await supabase
        .from('day_activities')
        .upsert(
          activities.map(activity => ({
            id: activity.id,
            day_id: dayId,
            order_index: activity.order_index
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });
      toast.success('Activities reordered successfully');
    },
    onError: () => {
      toast.error('Failed to reorder activities');
    }
  });

  return {
    days,
    isLoading,
    addDay,
    updateDay,
    addActivity,
    reorderActivities,
    refreshDays
  };
};
