
import React from 'react';
import { Tables } from '@/integrations/supabase/types';
import { Car, Plane, Train, Bus, Ship } from 'lucide-react';
import { format } from 'date-fns';

type TransportationEvent = Tables<'transportation_events'>;

interface TransportationListItemProps {
  event: TransportationEvent;
  onClick: (event: TransportationEvent) => void;
}

const TransportationListItem: React.FC<TransportationListItemProps> = ({
  event,
  onClick,
}) => {
  const getIcon = (type: TransportationEvent['type']) => {
    switch (type) {
      case 'flight':
        return <Plane className="h-5 w-5 text-earth-500" />;
      case 'train':
        return <Train className="h-5 w-5 text-earth-500" />;
      case 'car_service':
      case 'rental_car':
        return <Car className="h-5 w-5 text-earth-500" />;
      case 'shuttle':
        return <Bus className="h-5 w-5 text-earth-500" />;
      case 'ferry':
        return <Ship className="h-5 w-5 text-earth-500" />;
      default:
        return <Car className="h-5 w-5 text-earth-500" />;
    }
  };

  const formatDateTime = (date: string, time?: string | null) => {
    const formattedDate = format(new Date(date), 'MM/dd/yy');
    if (time) {
      const [hours, minutes] = time.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours), parseInt(minutes));
      const formattedTime = format(timeDate, 'h:mm a').toLowerCase();
      return `${formattedDate} ${formattedTime}`;
    }
    return formattedDate;
  };

  return (
    <button
      onClick={() => onClick(event)}
      className="w-full text-left flex items-start gap-4 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-earth-500 focus:ring-offset-2"
      type="button"
      aria-label={`${event.type.replace('_', ' ')} details from ${event.departure_location} to ${event.arrival_location}`}
    >
      {getIcon(event.type)}
      <div className="flex-1">
        <div className="flex justify-between">
          <h4 className="font-semibold capitalize">
            {event.type.replace('_', ' ')}
          </h4>
          {event.provider && (
            <span className="text-sm text-gray-600">{event.provider}</span>
          )}
        </div>
        {event.details && (
          <p className="text-sm text-gray-600 mt-1">{event.details}</p>
        )}
        <div className="mt-2 text-sm">
          <p>
            From: {event.departure_location} ({formatDateTime(event.start_date, event.start_time)})
          </p>
          {event.end_date && (
            <p>
              To: {event.arrival_location} ({formatDateTime(event.end_date, event.end_time)})
            </p>
          )}
        </div>
        {event.confirmation_number && (
          <p className="text-sm text-gray-600 mt-1">
            Confirmation: {event.confirmation_number}
          </p>
        )}
        {event.cost && (
          <p className="text-sm text-gray-600 mt-1">
            Cost: {event.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {event.currency}
          </p>
        )}
      </div>
    </button>
  );
};

export default TransportationListItem;
