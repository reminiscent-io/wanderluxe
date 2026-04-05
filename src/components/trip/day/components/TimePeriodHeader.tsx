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
        "flex items-center gap-3 py-2 sm:py-3 px-0 cursor-pointer select-none group w-full text-left bg-transparent border-0",
        !isFirst && "mt-2 sm:mt-3 pt-3 sm:pt-4 border-t border-sand-100"
      )}
      onClick={onToggle}
    >
      {/* Chevron Icon */}
      <div className="flex-shrink-0 text-earth-500 group-hover:text-earth-700 transition-colors">
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </div>

      {/* Period Label */}
      <h4 className="text-xs sm:text-sm font-semibold text-earth-700 uppercase tracking-wide group-hover:text-earth-900 transition-colors">
        {label}
      </h4>

      {/* Event Count Badge */}
      <div className="flex-shrink-0 px-2 py-0.5 rounded-full bg-earth-100 text-earth-600 text-[10px] font-medium">
        {eventCount}
      </div>

      {/* Divider Line */}
      <div className="flex-1 h-px bg-sand-200" />
    </button>
  );
};

export default React.memo(TimePeriodHeader);
