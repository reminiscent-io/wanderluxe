import { useAdminMetrics } from '@/hooks/useAdminMetrics';
import { Activity, TrendingUp, Users } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { format, parseISO } from 'date-fns';

// Format event type for display
function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function AdminEngagementTab() {
  const {
    engagementSummary,
    engagementOverTime,
    isLoading,
  } = useAdminMetrics();

  // Calculate totals
  const totalEvents = engagementSummary.reduce((sum, e) => sum + e.event_count, 0);
  const totalUniqueUsers = new Set(engagementSummary.flatMap(e => e.unique_users)).size ||
    Math.max(...engagementSummary.map(e => e.unique_users), 0);

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
      {/* Summary Cards */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-earth-900">30-Day Summary</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            title="Total Events"
            value={totalEvents}
            icon={Activity}
          />
          <MetricCard
            title="Event Types"
            value={engagementSummary.length}
            icon={TrendingUp}
          />
          <MetricCard
            title="Unique Users"
            value={totalUniqueUsers}
            icon={Users}
          />
        </div>
      </section>

      {/* Events by Type */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-earth-900">Events by Type</h3>
        <div className="rounded-xl border border-sand-200 bg-background overflow-hidden">
          {engagementSummary.length === 0 ? (
            <p className="p-6 text-center text-sand-500">No engagement data available</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-sand-200 bg-sand-50">
                  <th className="px-6 py-3 text-left text-sm font-medium text-sand-600">Event Type</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-sand-600">Count</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-sand-600">Unique Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {engagementSummary.map((event) => (
                  <tr key={event.event_type} className="hover:bg-sand-50">
                    <td className="px-6 py-4 text-sm text-earth-900">
                      {formatEventType(event.event_type)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-earth-900">
                      {event.event_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-sand-600">
                      {event.unique_users.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Activity Over Time */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-earth-900">Daily Activity (Last 30 Days)</h3>
        <div className="rounded-xl border border-sand-200 bg-background p-6">
          {engagementOverTime.length === 0 ? (
            <p className="text-center text-sand-500">No activity data available</p>
          ) : (
            <div className="space-y-2">
              {engagementOverTime.slice(-14).map((day) => {
                const maxCount = Math.max(...engagementOverTime.map(d => d.event_count));
                const percentage = maxCount > 0 ? (day.event_count / maxCount) * 100 : 0;

                return (
                  <div key={day.event_date} className="flex items-center gap-4">
                    <span className="w-20 flex-shrink-0 text-sm text-sand-500">
                      {format(parseISO(day.event_date), 'MMM d')}
                    </span>
                    <div className="flex-1">
                      <div className="h-5 overflow-hidden rounded bg-sand-100">
                        <div
                          className="h-full bg-sand-500 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-12 flex-shrink-0 text-right text-sm font-medium text-earth-900">
                      {day.event_count}
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
