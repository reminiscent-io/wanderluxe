import React from 'react';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}

export function FilterChip({ active, onClick, label, count, icon }: FilterChipProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full text-sm font-medium transition-colors',
        // Mobile: 44px tap target. Desktop: tighter chip.
        'min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:px-3.5 sm:py-1.5',
        '[scroll-snap-align:start]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-earth-500 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50',
        active
          ? 'bg-earth-600 text-white shadow-warm-sm'
          : 'bg-white text-earth-600 border border-earth-200 hover:bg-sand-100 active:bg-sand-200'
      )}
    >
      {icon}
      <span>{label}</span>
      <span className={cn('text-xs tabular-nums', active ? 'opacity-70' : 'text-earth-400')}>
        {count}
      </span>
    </button>
  );
}

export default FilterChip;
