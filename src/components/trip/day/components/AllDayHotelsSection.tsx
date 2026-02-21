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
    <div className="bg-secondary rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-earth-700 uppercase tracking-wider">All Day</span>
      </div>
      {stays.map(stay => (
        <div
          key={`allday-${stay.stay_id}`}
          className="flex items-center gap-2 cursor-pointer hover:bg-muted rounded p-2 -m-1 transition-colors"
          onClick={() => onHotelClick && onHotelClick(stay)}
        >
          <Hotel className="h-3 w-3 text-muted-foreground" />
          <div className="flex-1">
            <div className="text-sm font-medium text-foreground hover:text-blue-600 transition-colors">
              Staying at {stay.hotel}
            </div>
            {stay.hotel_address && (
              <div className="text-xs text-earth-600">{stay.hotel_address}</div>
            )}
          </div>
          <div className="flex-shrink-0 ml-2">
            <TravelerAvatars tripId={tripId} eventType="accommodation" eventId={stay.stay_id} maxShow={3} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default AllDayHotelsSection;
