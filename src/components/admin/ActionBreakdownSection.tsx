import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Zap } from 'lucide-react';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';

const BAR_COLORS = ['#FB923C', '#FDBA74', '#F59E0B', '#D97706', '#C2A76E'];

export function ActionBreakdownSection() {
  const { groupedActions } = useAdminMetrics();

  const hasData = groupedActions.some((a) => a.count > 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-earth-500" />
        <h3 className="text-lg font-semibold text-earth-900">
          What are people doing?
        </h3>
      </div>

      <div className="rounded-xl border border-sand-200 bg-background p-5 shadow-warm-sm">
        {hasData ? (
          <ResponsiveContainer width="100%" height={groupedActions.length * 52 + 20}>
            <BarChart
              data={groupedActions}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B6354' }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 13, fill: '#3D3629', fontWeight: 500 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid #D6CEC4',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px -2px rgba(139,119,93,0.1)',
                  padding: '8px 12px',
                }}
                formatter={(value: number, _name: string, props: { payload: { uniqueUsers: number } }) => [
                  `${value} actions (${props.payload.uniqueUsers} user${props.payload.uniqueUsers !== 1 ? 's' : ''})`,
                  'Last 30 days',
                ]}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={800}>
                {groupedActions.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-sm text-sand-400">
            No actions recorded in the last 30 days
          </div>
        )}
      </div>
    </section>
  );
}
