import React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  isFirst?: boolean;
};

const TimePeriodHeader: React.FC<Props> = ({ label, isFirst = false }) => {
  return (
    <div className={cn(
      "flex items-center gap-3 py-2 sm:py-3 px-0",
      !isFirst && "mt-2 sm:mt-3 pt-3 sm:pt-4 border-t border-sand-100"
    )}>
      <h4 className="text-xs sm:text-sm font-semibold text-earth-700 uppercase tracking-wide">
        {label}
      </h4>
      <div className="flex-1 h-px bg-sand-200" />
    </div>
  );
};

export default React.memo(TimePeriodHeader);
