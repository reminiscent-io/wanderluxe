import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TripStats {
  total_trips: number;
  upcoming_trips: number;
  active_trips: number;
  past_trips: number;
}

interface SubscriptionStats {
  tier: string;
  user_count: number;
}

interface EngagementSummary {
  event_type: string;
  event_count: number;
  unique_users: number;
}

interface SignupsByWeek {
  week_start: string;
  signup_count: number;
}

interface EngagementOverTime {
  event_date: string;
  event_count: number;
}

export function useAdminMetrics() {
  // Total user count
  const userCount = useQuery({
    queryKey: ['admin', 'userCount'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_user_count');
      if (error) throw error;
      return data as number;
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Active users (7 days)
  const activeUsers7d = useQuery({
    queryKey: ['admin', 'activeUsers', 7],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_active_users', { days_back: 7 });
      if (error) throw error;
      return data as number;
    },
    staleTime: 60 * 1000,
  });

  // Active users (30 days)
  const activeUsers30d = useQuery({
    queryKey: ['admin', 'activeUsers', 30],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_active_users', { days_back: 30 });
      if (error) throw error;
      return data as number;
    },
    staleTime: 60 * 1000,
  });

  // Trip statistics
  const tripStats = useQuery({
    queryKey: ['admin', 'tripStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_trip_stats');
      if (error) throw error;
      // RPC returns array with single row
      const row = Array.isArray(data) ? data[0] : data;
      return row as TripStats;
    },
    staleTime: 60 * 1000,
  });

  // Subscription stats
  const subscriptionStats = useQuery({
    queryKey: ['admin', 'subscriptionStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_subscription_stats');
      if (error) throw error;
      return data as SubscriptionStats[];
    },
    staleTime: 60 * 1000,
  });

  // Engagement summary (30 days)
  const engagementSummary = useQuery({
    queryKey: ['admin', 'engagementSummary', 30],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_engagement_summary', { days_back: 30 });
      if (error) throw error;
      return data as EngagementSummary[];
    },
    staleTime: 60 * 1000,
  });

  // Signups by week (12 weeks)
  const signupsByWeek = useQuery({
    queryKey: ['admin', 'signupsByWeek', 12],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_signups_by_week', { weeks_back: 12 });
      if (error) throw error;
      return data as SignupsByWeek[];
    },
    staleTime: 60 * 1000,
  });

  // Engagement over time (30 days)
  const engagementOverTime = useQuery({
    queryKey: ['admin', 'engagementOverTime', 30],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_engagement_over_time', { days_back: 30 });
      if (error) throw error;
      return data as EngagementOverTime[];
    },
    staleTime: 60 * 1000,
  });

  // Entity counts
  const accommodationCount = useQuery({
    queryKey: ['admin', 'tableCount', 'accommodations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_table_count', { table_name: 'accommodations' });
      if (error) throw error;
      return data as number;
    },
    staleTime: 60 * 1000,
  });

  const activityCount = useQuery({
    queryKey: ['admin', 'tableCount', 'day_activities'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_table_count', { table_name: 'day_activities' });
      if (error) throw error;
      return data as number;
    },
    staleTime: 60 * 1000,
  });

  const reservationCount = useQuery({
    queryKey: ['admin', 'tableCount', 'reservations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_table_count', { table_name: 'reservations' });
      if (error) throw error;
      return data as number;
    },
    staleTime: 60 * 1000,
  });

  const isLoading =
    userCount.isLoading ||
    activeUsers7d.isLoading ||
    activeUsers30d.isLoading ||
    tripStats.isLoading ||
    subscriptionStats.isLoading;

  const error =
    userCount.error ||
    activeUsers7d.error ||
    activeUsers30d.error ||
    tripStats.error ||
    subscriptionStats.error;

  return {
    // User metrics
    userCount: userCount.data ?? 0,
    activeUsers7d: activeUsers7d.data ?? 0,
    activeUsers30d: activeUsers30d.data ?? 0,

    // Trip metrics
    tripStats: tripStats.data ?? {
      total_trips: 0,
      upcoming_trips: 0,
      active_trips: 0,
      past_trips: 0,
    },

    // Subscription metrics
    subscriptionStats: subscriptionStats.data ?? [],

    // Engagement metrics
    engagementSummary: engagementSummary.data ?? [],
    signupsByWeek: signupsByWeek.data ?? [],
    engagementOverTime: engagementOverTime.data ?? [],

    // Entity counts
    accommodationCount: accommodationCount.data ?? 0,
    activityCount: activityCount.data ?? 0,
    reservationCount: reservationCount.data ?? 0,

    // Status
    isLoading,
    error,

    // Refetch functions
    refetchAll: () => {
      userCount.refetch();
      activeUsers7d.refetch();
      activeUsers30d.refetch();
      tripStats.refetch();
      subscriptionStats.refetch();
      engagementSummary.refetch();
      signupsByWeek.refetch();
      engagementOverTime.refetch();
      accommodationCount.refetch();
      activityCount.refetch();
      reservationCount.refetch();
    },
  };
}
