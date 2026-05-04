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
        'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors',
        active
          ? 'bg-earth-600 text-white'
          : 'bg-white text-earth-600 border border-earth-200 hover:bg-sand-100'
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
