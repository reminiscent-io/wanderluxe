import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Share2 } from 'lucide-react';
import { StatChip } from './StatChip';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';

export function SharingSection() {
  const { sharingStats, sharesOverTime } = useAdminMetrics();

  const hasChartData = sharesOverTime.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Share2 className="h-5 w-5 text-earth-500" />
        <h3 className="text-lg font-semibold text-earth-900">
          How much sharing?
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatChip
          label="Shared Trips"
          value={sharingStats.shared_trips}
        />
        <StatChip
          label="Total Shares"
          value={sharingStats.total_shares}
        />
        <StatChip
          label="New This Month"
          value={sharingStats.shares_this_month > 0 ? `+${sharingStats.shares_this_month}` : '0'}
        />
      </div>

      <div className="rounded-xl border border-sand-200 bg-background p-5 shadow-warm-sm">
        {hasChartData ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={sharesOverTime}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D9" vertical={false} />
              <XAxis
                dataKey="week_start"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B6354' }}
                tickFormatter={(d) => format(parseISO(d), 'MMM d')}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B6354' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid #D6CEC4',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px -2px rgba(139,119,93,0.1)',
                  padding: '8px 12px',
                }}
                labelFormatter={(d) => `Week of ${format(parseISO(d as string), 'MMM d, yyyy')}`}
                formatter={(value: number) => [
                  `${value} share${value !== 1 ? 's' : ''}`,
                  'New Shares',
                ]}
              />
              <Bar
                dataKey="share_count"
                fill="#FDBA74"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[180px] items-center justify-center text-sm text-sand-400">
            No sharing activity in the last 12 weeks
          </div>
        )}
      </div>
    </section>
  );
}
