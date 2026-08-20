import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  /** First / last rail-bearing row in its run, so the line stops at the node. */
  railStart?: boolean;
  railEnd?: boolean;
};

const NowIndicator: React.FC<Props> = ({ railStart, railEnd }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Align to the next minute boundary, then tick every 60s.
    let interval: ReturnType<typeof setInterval>;
    const start = new Date();
    const msToNextMinute = (60 - start.getSeconds()) * 1000 - start.getMilliseconds();
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="tl-row">
      <div className="py-1 text-right text-ui-xs font-semibold tabular-nums text-destructive-ink">
        {timeStr}
      </div>
      <div aria-hidden className="relative flex justify-center">
        {!(railStart && railEnd) && (
          <div
            className={cn(
              'absolute w-px bg-border',
              railStart ? 'top-3' : 'top-0',
              railEnd ? 'h-3' : 'bottom-0',
            )}
          />
        )}
        <div className="relative mt-2 h-2 w-2 shrink-0 rounded-full bg-destructive ring-4 ring-background" />
      </div>
      <div className="flex items-center py-1">
        <div className="h-px flex-1 bg-destructive/70" />
      </div>
    </div>
  );
};

export default React.memo(NowIndicator);
