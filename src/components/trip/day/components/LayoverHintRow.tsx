import React from 'react';

const LayoverHintRow: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="flex gap-4 pb-3 -mt-1">
      {/* time column spacer */}
      <div className="w-20 md:w-24 flex-shrink-0" />
      {/* faint continuation of rail */}
      <div className="relative flex flex-col items-center">
        <div className="w-3 h-3 rounded-full opacity-0 mt-0.5" />
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
