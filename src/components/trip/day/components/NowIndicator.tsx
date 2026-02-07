import React, { useState, useEffect, useRef } from 'react';

const NowIndicator: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Align to the next minute boundary
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    const timeout = setTimeout(() => {
      setNow(new Date());
      // Then update every 60s
      const interval = setInterval(() => setNow(new Date()), 60000);
      return () => clearInterval(interval);
    }, msToNextMinute);

    return () => clearTimeout(timeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div ref={ref} className="relative py-1">
      {/* Mobile Layout */}
      <div className="sm:hidden">
        <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
          <div className="flex justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 z-10" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-red-500" />
            <span className="text-[10px] font-semibold text-red-500 whitespace-nowrap uppercase tracking-wide">
              Now {timeStr}
            </span>
            <div className="flex-1 h-px bg-red-500" />
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:grid sm:grid-cols-[60px_40px_1fr] gap-0 items-center">
        <div className="text-right pr-2">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Now</span>
        </div>
        <div className="flex justify-center">
          <div className="w-3 h-3 rounded-full bg-red-500 z-10 ring-2 ring-red-200" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-red-500" />
          <span className="text-[10px] font-semibold text-red-500 whitespace-nowrap">
            {timeStr}
          </span>
          <div className="w-8 h-px bg-red-500" />
        </div>
      </div>
    </div>
  );
};

export default React.memo(NowIndicator);
