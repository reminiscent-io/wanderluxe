import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatChipProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // percentage, positive = up
  className?: string;
}

export function StatChip({ label, value, subtitle, trend, className }: StatChipProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-lg border border-sand-200 bg-background px-4 py-3 shadow-warm-sm',
        className,
      )}
    >
      <span className="text-xs font-medium text-sand-500">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold text-earth-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {trend !== undefined && trend !== 0 && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend > 0 ? 'text-emerald-600' : 'text-red-500',
            )}
          >
            {trend > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend > 0 ? '+' : ''}
            {trend}%
          </span>
        )}
      </div>
      {subtitle && (
        <span className="text-xs text-sand-400">{subtitle}</span>
      )}
    </div>
  );
}
