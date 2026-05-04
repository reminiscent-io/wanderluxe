import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  /** Stable id used so the surrounding <section> can wire aria-labelledby */
  id: string;
  title: string;
  count?: number;
  /** Mute the heading + count to differentiate "past" sections from active ones */
  muted?: boolean;
  /** Override the count's color (e.g. emerald for currently-traveling) */
  countClassName?: string;
  className?: string;
}

export function SectionHeader({
  id,
  title,
  count,
  muted = false,
  countClassName,
  className,
}: SectionHeaderProps) {
  return (
    <header className={cn('mb-6 flex items-baseline gap-3', className)}>
      <h2
        id={id}
        className={cn(
          'font-display text-3xl md:text-4xl',
          muted ? 'text-earth-600' : 'text-earth-800'
        )}
      >
        {title}
      </h2>
      {typeof count === 'number' && (
        <span
          className={cn(
            'text-base font-medium tabular-nums',
            countClassName ?? 'text-earth-400'
          )}
        >
          {count}
        </span>
      )}
    </header>
  );
}

export default SectionHeader;
