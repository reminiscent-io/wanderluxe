import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import { StatChip } from './StatChip';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';

export function EngagementFrequencySection() {
  const { dailyEngagementChart, avgEventsPerDay, peakDay, engagementTrend } =
    useAdminMetrics();

  const hasData = dailyEngagementChart.some((d) => d.value > 0);

  const peakLabel =
    peakDay.date
      ? `${peakDay.value} on ${format(parseISO(peakDay.date), 'MMM d')}`
      : '—';

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-earth-500" />
        <h3 className="text-lg font-semibold text-earth-900">
          How often are people checking?
        </h3>
      </div>

      <div className="rounded-xl border border-sand-200 bg-background p-5 shadow-warm-sm">
        {hasData ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={dailyEngagementChart}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8A7F6C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8A7F6C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D9" vertical={false} />
              <XAxis
                dataKey="date"
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
                labelFormatter={(d) => format(parseISO(d as string), 'MMM d, yyyy')}
                formatter={(value: number) => [
                  `${value} event${value !== 1 ? 's' : ''}`,
                  'Activity',
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8A7F6C"
                strokeWidth={2}
                fill="url(#engagementGradient)"
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-sm text-sand-400">
            No engagement data in the last 30 days
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatChip
          label="Avg Events / Day"
          value={avgEventsPerDay}
        />
        <StatChip
          label="Peak Day"
          value={peakLabel}
        />
        <StatChip
          label="vs Prior 30 Days"
          value={engagementTrend !== 0 ? `${engagementTrend > 0 ? '+' : ''}${engagementTrend}%` : 'Flat'}
          trend={engagementTrend}
        />
      </div>
    </section>
  );
}
