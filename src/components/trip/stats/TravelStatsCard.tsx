import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type GradientType = 'blue' | 'green' | 'purple' | 'sand' | 'amber';

interface TravelStatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  gradient: GradientType;
  chart?: 'progress' | 'donut';
  chartData?: { completed: number; total: number };
  className?: string;
  compact?: boolean;
  noBackground?: boolean;
  onClick?: () => void;
}

const gradientClasses: Record<GradientType, { bg: string; icon: string; iconBg: string; text: string }> = {
  blue: {
    bg: 'bg-gradient-to-br from-sunset-100/60 to-sand-100 border-sand-200/50',
    icon: 'text-sunset-600',
    iconBg: 'bg-sunset-100',
    text: 'text-earth-900'
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/20 border-emerald-200/50',
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    text: 'text-emerald-900'
  },
  purple: {
    bg: 'bg-gradient-to-br from-earth-100/60 to-sand-100 border-sand-200/50',
    icon: 'text-earth-600',
    iconBg: 'bg-earth-100',
    text: 'text-earth-900'
  },
  sand: {
    bg: 'bg-gradient-to-br from-sand-100 to-earth-100 border-sand-200/50',
    icon: 'text-earth-600',
    iconBg: 'bg-sand-200',
    text: 'text-earth-900'
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-500/10 to-amber-600/20 border-amber-200/50',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-100',
    text: 'text-amber-900'
  }
};

export function TravelStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  chart,
  chartData,
  className,
  compact,
  noBackground,
  onClick
}: TravelStatsCardProps) {
  const colors = gradientClasses[gradient];

  const chartPercentage = chart && chartData && chartData.total > 0
    ? (chartData.completed / chartData.total) * 100
    : 0;

  const progressBarColorMap: Record<GradientType, string> = {
    blue: 'bg-sunset-500',
    green: 'bg-emerald-500',
    purple: 'bg-earth-500',
    sand: 'bg-earth-500',
    amber: 'bg-earth-500',
  };

  const renderChart = () => {
    if (!chart || !chartData) return null;

    if (chart === 'donut') {
      const circumference = 2 * Math.PI * 20;
      const strokeDashoffset = circumference - (chartPercentage / 100) * circumference;

      return (
        <div className={cn("relative flex-shrink-0", compact ? "w-11 h-11" : "w-14 h-14")}>
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-sand-200"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className={colors.icon}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
            />
          </svg>
          <div className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold", colors.text)}>
            {Math.round(chartPercentage)}%
          </div>
        </div>
      );
    }

    if (chart === 'progress') {
      return (
        <div className="w-full h-2 bg-sand-200 rounded-full overflow-hidden mt-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${chartPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn("h-full rounded-full", progressBarColorMap[gradient])}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl border backdrop-blur-sm",
        compact ? "p-3" : "p-4",
        noBackground ? "border-sand-200/50 bg-transparent" : colors.bg,
        onClick && "cursor-pointer hover:scale-[1.02] transition-transform",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {!noBackground && (
              <div className={cn("p-1.5 rounded-lg", colors.iconBg)}>
                <Icon className={cn("h-4 w-4", colors.icon)} />
              </div>
            )}
            <span className="text-xs font-medium text-earth-600 truncate">{title}</span>
          </div>
          <div className={cn("font-black tracking-tight", compact ? "text-2xl" : "text-3xl md:text-4xl", colors.text)}>
            {value}
          </div>
          {subtitle && (
            <p className="text-xs text-earth-500 mt-0.5">{subtitle}</p>
          )}
          {chart === 'progress' && renderChart()}
        </div>
        {chart === 'donut' && renderChart()}
      </div>
    </motion.div>
  );
}

export default TravelStatsCard;
