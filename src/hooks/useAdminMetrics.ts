import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, eachDayOfInterval, parseISO } from 'date-fns';

interface TripStats {
  total_trips: number;
  upcoming_trips: number;
  active_trips: number;
  past_trips: number;
}

interface EngagementSummary {
  event_type: string;
  event_count: number;
  unique_users: number;
}

interface EngagementOverTime {
  event_date: string;
  event_count: number;
}

interface DailyUniqueUsers {
  event_date: string;
  unique_users: number;
}

interface SharingStats {
  total_shares: number;
  shared_trips: number;
  shares_this_month: number;
}

interface SharesOverTime {
  week_start: string;
  share_count: number;
}

interface GroupedAction {
  label: string;
  count: number;
  uniqueUsers: number;
}

// Fill missing dates with zero for continuous chart data
function fillMissingDates<T extends { event_date: string }>(
  data: T[],
  daysBack: number,
  valueKey: keyof T,
): Array<{ date: string; value: number }> {
  const today = new Date();
  const startDate = subDays(today, daysBack);
  const allDays = eachDayOfInterval({ start: startDate, end: today });

  const dataMap = new Map(
    data.map((d) => [d.event_date, Number(d[valueKey])]),
  );

  return allDays.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return {
      date: dateStr,
      value: dataMap.get(dateStr) ?? 0,
    };
  });
}

// Group raw event types into human-readable categories
const ACTION_CATEGORY_MAP: Record<string, { label: string; types: string[] }> = {
  trips: { label: 'Trip Planning', types: ['trips_insert', 'trips_update'] },
  activities: { label: 'Activities', types: ['day_activities_insert', 'day_activities_update'] },
  dining: { label: 'Dining', types: ['reservations_insert', 'reservations_update'] },
  stays: { label: 'Accommodations', types: ['accommodations_insert', 'accommodations_update'] },
  transport: { label: 'Transportation', types: ['transportation_insert', 'transportation_update'] },
};

function groupEngagementByCategory(summary: EngagementSummary[]): GroupedAction[] {
  return Object.values(ACTION_CATEGORY_MAP)
    .map(({ label, types }) => {
      const matching = summary.filter((s) => types.includes(s.event_type));
      return {
        label,
        count: matching.reduce((sum, m) => sum + m.event_count, 0),
        uniqueUsers: Math.max(...matching.map((m) => m.unique_users), 0),
      };
    })
    .sort((a, b) => b.count - a.count);
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
    staleTime: 60 * 1000,
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

  // New users (30 days)
  const newUsers30d = useQuery({
    queryKey: ['admin', 'newUsers', 30],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_new_users', { days_back: 30 });
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
      const row = Array.isArray(data) ? data[0] : data;
      return row as TripStats;
    },
    staleTime: 60 * 1000,
  });

  // Daily unique active users (30 days) — for sign-in trend chart
  const dailyUniqueUsers = useQuery({
    queryKey: ['admin', 'dailyUniqueUsers', 30],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_daily_unique_users', { days_back: 30 });
      if (error) throw error;
      return data as DailyUniqueUsers[];
    },
    staleTime: 60 * 1000,
  });

  // Engagement summary (30 days) — for action breakdown
  const engagementSummary = useQuery({
    queryKey: ['admin', 'engagementSummary', 30],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_engagement_summary', { days_back: 30 });
      if (error) throw error;
      return data as EngagementSummary[];
    },
    staleTime: 60 * 1000,
  });

  // Engagement over time (60 days) — for trend comparison
  const engagementOverTime = useQuery({
    queryKey: ['admin', 'engagementOverTime', 60],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_engagement_over_time', { days_back: 60 });
      if (error) throw error;
      return data as EngagementOverTime[];
    },
    staleTime: 60 * 1000,
  });

  // Sharing stats
  const sharingStats = useQuery({
    queryKey: ['admin', 'sharingStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_sharing_stats');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as SharingStats;
    },
    staleTime: 60 * 1000,
  });

  // Shares over time (12 weeks)
  const sharesOverTime = useQuery({
    queryKey: ['admin', 'sharesOverTime', 12],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_shares_over_time', { weeks_back: 12 });
      if (error) throw error;
      return data as SharesOverTime[];
    },
    staleTime: 60 * 1000,
  });

  // Computed: fill missing dates for daily unique users chart
  const dailyUniqueUsersChart = fillMissingDates(
    dailyUniqueUsers.data ?? [],
    30,
    'unique_users',
  );

  // Computed: split engagement into current 30d vs prior 30d
  const rawEngagement = engagementOverTime.data ?? [];
  const today = new Date();
  const thirtyDaysAgo = format(subDays(today, 30), 'yyyy-MM-dd');

  const current30d = rawEngagement.filter((d) => d.event_date >= thirtyDaysAgo);
  const prior30d = rawEngagement.filter((d) => d.event_date < thirtyDaysAgo);

  const current30dTotal = current30d.reduce((sum, d) => sum + d.event_count, 0);
  const prior30dTotal = prior30d.reduce((sum, d) => sum + d.event_count, 0);

  const engagementTrend =
    prior30dTotal > 0
      ? Math.round(((current30dTotal - prior30dTotal) / prior30dTotal) * 100)
      : current30dTotal > 0
        ? 100
        : 0;

  // Computed: fill daily engagement chart data (last 30 days only)
  const dailyEngagementChart = fillMissingDates(current30d, 30, 'event_count');

  const avgEventsPerDay =
    dailyEngagementChart.length > 0
      ? Math.round(current30dTotal / dailyEngagementChart.length)
      : 0;

  const peakDay = dailyEngagementChart.reduce(
    (max, d) => (d.value > max.value ? d : max),
    { date: '', value: 0 },
  );

  // Computed: grouped actions
  const groupedActions = groupEngagementByCategory(engagementSummary.data ?? []);

  const isLoading =
    userCount.isLoading ||
    activeUsers7d.isLoading ||
    activeUsers30d.isLoading ||
    newUsers30d.isLoading ||
    tripStats.isLoading ||
    dailyUniqueUsers.isLoading ||
    engagementSummary.isLoading ||
    engagementOverTime.isLoading ||
    sharingStats.isLoading ||
    sharesOverTime.isLoading;

  return {
    // Pulse bar
    userCount: userCount.data ?? 0,
    activeUsers7d: activeUsers7d.data ?? 0,
    activeUsers30d: activeUsers30d.data ?? 0,
    newUsers30d: newUsers30d.data ?? 0,

    // Trip stats
    tripStats: tripStats.data ?? {
      total_trips: 0,
      upcoming_trips: 0,
      active_trips: 0,
      past_trips: 0,
    },

    // Section 1: Sign-in trends
    dailyUniqueUsersChart,

    // Section 2: Actions
    groupedActions,

    // Section 3: Engagement frequency
    dailyEngagementChart,
    avgEventsPerDay,
    peakDay,
    engagementTrend,

    // Section 4: Sharing
    sharingStats: sharingStats.data ?? {
      total_shares: 0,
      shared_trips: 0,
      shares_this_month: 0,
    },
    sharesOverTime: sharesOverTime.data ?? [],

    // Status
    isLoading,

    // Refetch
    refetchAll: () => {
      userCount.refetch();
      activeUsers7d.refetch();
      activeUsers30d.refetch();
      newUsers30d.refetch();
      tripStats.refetch();
      dailyUniqueUsers.refetch();
      engagementSummary.refetch();
      engagementOverTime.refetch();
      sharingStats.refetch();
      sharesOverTime.refetch();
    },
  };
}
