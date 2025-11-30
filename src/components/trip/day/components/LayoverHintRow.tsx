import React from 'react';

const LayoverHintRow: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="grid grid-cols-[60px_40px_1fr] gap-0 pb-2 sm:pb-3">
      {/* Column 1: Time spacer */}
      <div className="flex-shrink-0" />
      {/* Column 2: Faint blue line continuation */}
      <div className="relative flex flex-col items-center">
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-blue-200 -translate-x-1/2" />
      </div>
      {/* Column 3: Hint text */}
      <div className="flex-1 min-w-0">
        <div className="text-xs italic text-earth-500">{text}</div>
      </div>
    </div>
  );
};

export default React.memo(LayoverHintRow);
