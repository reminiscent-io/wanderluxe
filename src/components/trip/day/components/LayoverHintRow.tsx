import React from 'react';
import { Plane, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HintType } from './timeline-utils';

type Props = {
  text: string;
  hintType?: HintType;
};

const LayoverHintRow: React.FC<Props> = ({ text, hintType = 'layover' }) => {
  const config = {
    layover: {
      icon: Plane,
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      iconColor: 'text-sky-500',
      textColor: 'text-sky-700',
      dotColor: 'bg-sky-300',
    },
    'free-time': {
      icon: Clock,
      bg: 'bg-sand-50',
      border: 'border-sand-200',
      iconColor: 'text-earth-400',
      textColor: 'text-earth-600',
      dotColor: 'bg-earth-300',
    },
    overlap: {
      icon: AlertTriangle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconColor: 'text-red-500',
      textColor: 'text-red-700',
      dotColor: 'bg-red-300',
    },
  }[hintType];

  const Icon = config.icon;

  return (
    <div className="pb-2 sm:pb-3">
      {/* Mobile Layout */}
      <div className="sm:hidden">
        <div className="grid grid-cols-[24px_1fr] gap-2">
          <div className="relative flex flex-col items-center">
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-3 z-10", config.dotColor)} />
          </div>
          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed", config.bg, config.border)}>
            <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", config.iconColor)} />
            <span className={cn("text-xs font-medium", config.textColor)}>{text}</span>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:grid sm:grid-cols-[60px_40px_1fr] gap-0">
        <div className="flex-shrink-0" />
        <div className="relative flex flex-col items-center">
          <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 mt-2.5 z-10", config.dotColor)} />
        </div>
        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed", config.bg, config.border)}>
          <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", config.iconColor)} />
          <span className={cn("text-xs font-medium", config.textColor)}>{text}</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(LayoverHintRow);
