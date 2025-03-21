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
    if (time) {
      // Combine date and time into an ISO string to construct a proper Date object
      const dateTime = new Date(`${date}T${time}`);
      return format(dateTime, 'MM/dd/yy h:mm a').toLowerCase();
    }
    return format(new Date(date), 'MM/dd/yy');
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
import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TransportationListItemProps {
  transportation: any; // Replace with your transportation type
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const TransportationListItem: React.FC<TransportationListItemProps> = ({
  transportation,
  onEdit,
  onDelete
}) => {
  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return dateString;
    }
  };

  return (
    <Card className="p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-4">
          <h3 className="font-semibold text-lg text-gray-900">{transportation.type || 'Transportation'}</h3>
          
          <div className="mt-2 text-sm text-gray-700">
            {transportation.from_location && transportation.to_location && (
              <p className="mb-1">
                <span className="font-medium">Route: </span>
                {transportation.from_location} to {transportation.to_location}
              </p>
            )}
            
            {transportation.departure_date && (
              <p className="mb-1">
                <span className="font-medium">Departure: </span>
                {formatDate(transportation.departure_date)}
                {transportation.departure_time && ` at ${transportation.departure_time}`}
              </p>
            )}
            
            {transportation.arrival_date && (
              <p className="mb-1">
                <span className="font-medium">Arrival: </span>
                {formatDate(transportation.arrival_date)}
                {transportation.arrival_time && ` at ${transportation.arrival_time}`}
              </p>
            )}
            
            {transportation.company && (
              <p className="mb-1">
                <span className="font-medium">Company: </span>
                {transportation.company}
              </p>
            )}
            
            {transportation.reservation_number && (
              <p className="mb-1">
                <span className="font-medium">Reservation: </span>
                {transportation.reservation_number}
              </p>
            )}
            
            {transportation.cost && (
              <p className="mb-1">
                <span className="font-medium">Cost: </span>
                {transportation.cost} {transportation.currency || ''}
              </p>
            )}
            
            {transportation.notes && (
              <p className="mb-1">
                <span className="font-medium">Notes: </span>
                {transportation.notes}
              </p>
            )}
          </div>
          
          {transportation.booking_link && (
            <a 
              href={transportation.booking_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 inline-block mt-2"
            >
              View booking details
            </a>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onEdit(transportation.id)}
            aria-label="Edit transportation"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onDelete(transportation.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            aria-label="Delete transportation"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {transportation.departure_date && transportation.arrival_date && (
        <div className="flex mt-3 space-x-2">
          <div className="flex-1 bg-blue-50 text-blue-700 text-xs rounded p-2">
            <span className="font-medium">Departure:</span> {formatDate(transportation.departure_date)}
            {transportation.departure_time && ` at ${transportation.departure_time}`}
          </div>
          <div className="flex-1 bg-green-50 text-green-700 text-xs rounded p-2">
            <span className="font-medium">Arrival:</span> {formatDate(transportation.arrival_date)}
            {transportation.arrival_time && ` at ${transportation.arrival_time}`}
          </div>
        </div>
      )}
    </Card>
  );
};

export default TransportationListItem;
