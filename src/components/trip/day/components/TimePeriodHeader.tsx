import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  isFirst?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  eventCount: number;
};

const TimePeriodHeader: React.FC<Props> = ({ label, isFirst = false, isExpanded, onToggle, eventCount }) => {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-2.5 py-2 sm:py-2.5 px-0 cursor-pointer select-none group w-full text-left bg-transparent border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
        !isFirst && "mt-3 pt-4"
      )}
      onClick={onToggle}
    >
      {/* Chevron Icon */}
      <div className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
      </div>

      {/* Period Label */}
      <h4 className="text-[11px] sm:text-xs font-medium text-foreground uppercase tracking-[0.16em] group-hover:text-primary transition-colors">
        {label}
      </h4>

      {/* Event Count */}
      <span className="flex-shrink-0 text-[11px] text-muted-foreground tabular-nums">
        {eventCount}
      </span>

      {/* Divider Line */}
      <div className="flex-1 h-px bg-border" />
    </button>
  );
};

export default React.memo(TimePeriodHeader);
