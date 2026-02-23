import { StatChip } from './StatChip';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';

export function PulseBar() {
  const { userCount, activeUsers7d, newUsers30d } = useAdminMetrics();

  const activePercent =
    userCount > 0 ? Math.round((activeUsers7d / userCount) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatChip
        label="Total Users"
        value={userCount}
      />
      <StatChip
        label="Active This Week"
        value={activeUsers7d}
        subtitle={`${activePercent}% of all users`}
      />
      <StatChip
        label="New This Month"
        value={newUsers30d > 0 ? `+${newUsers30d}` : '0'}
      />
    </div>
  );
}
