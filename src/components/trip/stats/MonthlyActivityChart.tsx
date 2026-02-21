import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MonthlyActivityData {
  month: string;
  days: number;
}

interface MonthlyActivityChartProps {
  data: MonthlyActivityData[];
  className?: string;
  height?: number;
  showAxis?: boolean;
  gradientId?: string;
}

export function MonthlyActivityChart({
  data,
  className,
  height = 80,
  showAxis = true,
  gradientId = 'travelGradient'
}: MonthlyActivityChartProps) {
  const hasData = data.some(d => d.days > 0);

  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "rounded-xl p-4 bg-gradient-to-br from-sand-50 to-earth-50 border border-sand-200/50",
          className
        )}
      >
        <div className="text-xs font-medium text-earth-600 mb-2">Travel Activity</div>
        <div
          className="flex items-center justify-center text-earth-400 text-sm"
          style={{ height }}
        >
          No travel data yet
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl p-4 bg-gradient-to-br from-sand-50/50 to-earth-50/50 border border-sand-200/50 backdrop-blur-sm",
        className
      )}
    >
      <div className="text-xs font-medium text-earth-600 mb-2">12-Month Travel Activity</div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: showAxis ? 0 : 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          {showAxis && (
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              interval="preserveStartEnd"
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              padding: '8px 12px'
            }}
            labelStyle={{ fontWeight: 600, color: '#374151' }}
            formatter={(value: number) => [`${value} day${value !== 1 ? 's' : ''}`, 'Travel']}
          />
          <Area
            type="monotone"
            dataKey="days"
            stroke="#3b82f6"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export default MonthlyActivityChart;
