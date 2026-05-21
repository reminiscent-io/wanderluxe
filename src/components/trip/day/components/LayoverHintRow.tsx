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
      bg: 'bg-accent/40',
      border: 'border-border',
      iconColor: 'text-earth-500',
      textColor: 'text-earth-600',
      dotColor: 'bg-sand-400',
    },
    'free-time': {
      icon: Clock,
      bg: 'bg-secondary/50',
      border: 'border-border',
      iconColor: 'text-earth-400',
      textColor: 'text-muted-foreground',
      dotColor: 'bg-sand-300',
    },
    overlap: {
      icon: AlertTriangle,
      bg: 'bg-destructive/10',
      border: 'border-destructive/30',
      iconColor: 'text-destructive',
      textColor: 'text-destructive',
      dotColor: 'bg-destructive/60',
    },
  }[hintType];

  const Icon = config.icon;

  return (
    <div className="pb-2 sm:pb-3">
      <div className="grid grid-cols-[24px_1fr] sm:grid-cols-[40px_1fr] gap-2 sm:gap-3">
        <div className="relative flex flex-col items-center">
          <div className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0 mt-2.5 z-10", config.dotColor)} />
        </div>
        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-md border", config.bg, config.border)}>
          <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", config.iconColor)} strokeWidth={1.5} />
          <span className={cn("text-xs", config.textColor)}>{text}</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(LayoverHintRow);
