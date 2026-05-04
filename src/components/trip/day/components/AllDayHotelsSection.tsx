import React from 'react';
import { Hotel } from 'lucide-react';
import { HotelStay } from '@/types/trip';
import TravelerAvatars from '../../timeline/TravelerAvatars'; // adjust path if needed

type Props = {
  stays: HotelStay[];
  onHotelClick?: (h: HotelStay) => void;
  tripId: string;
};

const AllDayHotelsSection: React.FC<Props> = ({ stays, onHotelClick, tripId }) => {
  if (stays.length === 0) return null;
  return (
    <div className="bg-secondary/60 rounded-card border border-border p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.16em]">All day</span>
      </div>
      <div className="space-y-1">
        {stays.map(stay => (
          <div
            key={`allday-${stay.stay_id}`}
            className="flex items-center gap-3 cursor-pointer hover:bg-card rounded-md p-2 -mx-2 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            role="button"
            tabIndex={0}
            onClick={() => onHotelClick?.(stay)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHotelClick?.(stay); } }}
          >
            <Hotel className="h-3.5 w-3.5 text-earth-500 flex-shrink-0" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                Staying at {stay.hotel}
              </div>
              {stay.hotel_address && (
                <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{stay.hotel_address}</div>
              )}
            </div>
            <div className="flex-shrink-0">
              <TravelerAvatars tripId={tripId} eventType="accommodation" eventId={stay.stay_id} maxShow={3} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllDayHotelsSection;
