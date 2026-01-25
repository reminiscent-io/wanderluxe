import { Users, MapPin, Plane, Hotel, Utensils, Activity } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';

export function AdminOverviewTab() {
  const {
    userCount,
    activeUsers7d,
    activeUsers30d,
    tripStats,
    subscriptionStats,
    accommodationCount,
    activityCount,
    reservationCount,
    isLoading,
  } = useAdminMetrics();

  // Calculate pro vs free users
  const proUsers = subscriptionStats.find(s => s.tier === 'pro')?.user_count ?? 0;
  const freeUsers = subscriptionStats.find(s => s.tier === 'free' || !s.tier)?.user_count ?? (userCount - proUsers);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-sand-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* User Metrics */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-earth-900">Users</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Users"
            value={userCount}
            icon={Users}
          />
          <MetricCard
            title="Active (7 days)"
            value={activeUsers7d}
            subtitle={userCount > 0 ? `${Math.round((activeUsers7d / userCount) * 100)}% of total` : undefined}
            icon={Activity}
          />
          <MetricCard
            title="Active (30 days)"
            value={activeUsers30d}
            subtitle={userCount > 0 ? `${Math.round((activeUsers30d / userCount) * 100)}% of total` : undefined}
            icon={Activity}
          />
          <MetricCard
            title="Pro Users"
            value={proUsers}
            subtitle={`${freeUsers} free users`}
            icon={Users}
          />
        </div>
      </section>

      {/* Trip Metrics */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-earth-900">Trips</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Trips"
            value={tripStats.total_trips}
            icon={MapPin}
          />
          <MetricCard
            title="Upcoming"
            value={tripStats.upcoming_trips}
            icon={Plane}
          />
          <MetricCard
            title="Active"
            value={tripStats.active_trips}
            subtitle="Currently in progress"
            icon={MapPin}
          />
          <MetricCard
            title="Completed"
            value={tripStats.past_trips}
            icon={MapPin}
          />
        </div>
      </section>

      {/* Entity Counts */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-earth-900">Content</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Accommodations"
            value={accommodationCount}
            icon={Hotel}
          />
          <MetricCard
            title="Activities"
            value={activityCount}
            icon={Activity}
          />
          <MetricCard
            title="Reservations"
            value={reservationCount}
            icon={Utensils}
          />
        </div>
      </section>
    </div>
  );
}
