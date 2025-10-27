import React from 'react';

const LayoverHintRow: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="flex gap-2 sm:gap-3 md:gap-4 pb-2 sm:pb-3 -mt-1">
      {/* time column spacer */}
      <div className="w-12 sm:w-16 md:w-20 lg:w-24 flex-shrink-0" />
      {/* faint continuation of rail */}
      <div className="relative flex flex-col items-center">
        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full opacity-0 mt-0.5" />
        <div className="absolute top-0 w-0.5 h-full rounded-full bg-sky-100" />
      </div>
      {/* hint text */}
      <div className="flex-1 min-w-0">
        <div className="text-xs italic text-earth-500">{text}</div>
      </div>
    </div>
  );
};

export default React.memo(LayoverHintRow);
