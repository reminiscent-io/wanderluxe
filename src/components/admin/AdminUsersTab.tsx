import { useAdminMetrics } from '@/hooks/useAdminMetrics';
import { MetricCard } from './MetricCard';
import { Users, UserPlus, Crown, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export function AdminUsersTab() {
  const {
    userCount,
    activeUsers7d,
    activeUsers30d,
    subscriptionStats,
    signupsByWeek,
    isLoading,
  } = useAdminMetrics();

  // Calculate subscription breakdown
  const proUsers = subscriptionStats.find(s => s.tier === 'pro')?.user_count ?? 0;
  const freeUsers = subscriptionStats.find(s => s.tier === 'free' || !s.tier)?.user_count ?? (userCount - proUsers);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-xl bg-sand-100" />
        <div className="h-64 animate-pulse rounded-xl bg-sand-100" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* User Summary */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-earth-900">User Summary</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Users"
            value={userCount}
            icon={Users}
          />
          <MetricCard
            title="Active (7d)"
            value={activeUsers7d}
            icon={Users}
          />
          <MetricCard
            title="Active (30d)"
            value={activeUsers30d}
            icon={Users}
          />
          <MetricCard
            title="Inactive (30d+)"
            value={Math.max(0, userCount - activeUsers30d)}
            icon={User}
          />
        </div>
      </section>

      {/* Subscription Breakdown */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-earth-900">Subscription Tiers</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <MetricCard
            title="Pro Users"
            value={proUsers}
            subtitle={userCount > 0 ? `${Math.round((proUsers / userCount) * 100)}% of total` : undefined}
            icon={Crown}
          />
          <MetricCard
            title="Free Users"
            value={freeUsers}
            subtitle={userCount > 0 ? `${Math.round((freeUsers / userCount) * 100)}% of total` : undefined}
            icon={User}
          />
        </div>
      </section>

      {/* Signups Over Time */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-earth-900">Weekly Signups (Last 12 Weeks)</h3>
        <div className="rounded-xl border border-sand-200 bg-background p-6">
          {signupsByWeek.length === 0 ? (
            <p className="text-center text-sand-500">No signup data available</p>
          ) : (
            <div className="space-y-3">
              {signupsByWeek.map((week) => {
                const maxCount = Math.max(...signupsByWeek.map(w => w.signup_count));
                const percentage = maxCount > 0 ? (week.signup_count / maxCount) * 100 : 0;

                return (
                  <div key={week.week_start} className="flex items-center gap-4">
                    <span className="w-24 flex-shrink-0 text-sm text-sand-500">
                      {format(parseISO(week.week_start), 'MMM d')}
                    </span>
                    <div className="flex-1">
                      <div className="h-6 overflow-hidden rounded bg-sand-100">
                        <div
                          className="h-full bg-sand-400 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-12 flex-shrink-0 text-right text-sm font-medium text-earth-900">
                      {week.signup_count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
