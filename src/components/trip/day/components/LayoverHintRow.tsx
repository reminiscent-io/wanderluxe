import React from 'react';
import { cn } from '@/lib/utils';
import { HintType } from './timeline-utils';

type Props = {
  text: string;
  hintType?: HintType;
};

/**
 * A gap in the day. Deliberately not a card: a dashed segment of the rail plus
 * one line of text, so empty time reads as absence rather than as another
 * event competing for attention.
 */
const LayoverHintRow: React.FC<Props> = ({ text, hintType = 'layover' }) => {
  const isOverlap = hintType === 'overlap';

  return (
    <div className="tl-row">
      <div />
      <div aria-hidden className="relative flex justify-center">
        <div
          className={cn(
            'absolute inset-y-0 w-px border-l border-dashed',
            isOverlap ? 'border-destructive/50' : 'border-border',
          )}
        />
      </div>
      <div className="py-2">
        <span className={cn('text-ui-sm tabular-nums', isOverlap ? 'text-destructive' : 'text-earth-500')}>
          {text}
        </span>
      </div>
    </div>
  );
};

export default React.memo(LayoverHintRow);
