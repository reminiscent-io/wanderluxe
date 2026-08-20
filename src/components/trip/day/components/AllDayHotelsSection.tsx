import React from 'react';
import { Bed } from 'lucide-react';
import { HotelStay } from '@/types/trip';

type Props = {
  stays: HotelStay[];
  onHotelClick?: (h: HotelStay) => void;
  tripId: string;
};

/**
 * Where you're sleeping is context for the whole day, not an event competing
 * with the day's plans. It gets a pinned strip under the header instead of a
 * timeline row: bed icon and property name only, address on hover.
 */
const AllDayHotelsSection: React.FC<Props> = ({ stays, onHotelClick }) => {
  if (stays.length === 0) return null;

  return (
    <div className="divide-y divide-border border-b border-border">
      {stays.map((stay) => (
        <button
          key={`allday-${stay.stay_id}`}
          type="button"
          title={stay.hotel_address || undefined}
          onClick={() => onHotelClick?.(stay)}
          className="flex h-strip w-full items-center gap-2.5 bg-secondary/50 px-3 text-left transition-colors hover:bg-secondary sm:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <Bed className="h-3.5 w-3.5 shrink-0 text-earth-500" strokeWidth={1.5} />
          <span className="min-w-0 flex-1 truncate text-ui-sm text-earth-600">{stay.hotel}</span>
        </button>
      ))}
    </div>
  );
};

export default AllDayHotelsSection;
