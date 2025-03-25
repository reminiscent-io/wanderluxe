import React from 'react';
import { HotelStay } from '@/types/trip';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { format, parse, parseISO } from 'date-fns';
import { CURRENCY_SYMBOLS } from '@/utils/currencyConstants';
import { formatDateRange } from '@/utils/formatDateRange';

interface HotelStaysListProps {
  hotelStays: HotelStay[];
  onEdit: (stayId: string) => void;
  onDelete: (stayId: string) => void;
}

// Formatter for dates (if you only want the date)
const formatDate = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'MMM d, yyyy');
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return dateString;
  }
};

// Formatter for date and time that handles time-only strings.
const formatDateTime = (dateTimeString: string): string => {
  try {
    let dateObj;
    // If the string is in HH:mm:ss format (time only)
    if (/^\d{2}:\d{2}:\d{2}$/.test(dateTimeString)) {
      // Use today's date as the reference.
      dateObj = parse(dateTimeString, 'HH:mm:ss', new Date());
      return format(dateObj, 'h:mm a');
    } else {
      dateObj = parseISO(dateTimeString);
      return format(dateObj, 'MMM d, yyyy, h:mm a');
    }
  } catch (error) {
    console.error("Error formatting date/time:", dateTimeString, error);
    return dateTimeString;
  }
};

const HotelStaysList: React.FC<HotelStaysListProps> = ({
  hotelStays,
  onEdit,
  onDelete
}) => {
  if (hotelStays.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No accommodations added yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {hotelStays.map((stay) => (
        <Card 
          key={stay.stay_id} 
          className="p-4 bg-white hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-4">
              <h3 className="font-semibold text-lg text-gray-900">{stay.hotel}</h3>

              <div className="mt-2 text-sm text-gray-700">
                <p className="mb-1">
                  <span className="font-medium">Stay: </span>
                  {formatDateRange(stay.checkin_time, stay.checkout_time)}
                </p>
                {stay.hotel_address && (
                  <p className="mb-1 line-clamp-2">
                    <span className="font-medium">Address: </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.hotel_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {stay.hotel_address}
                    </a>
                  </p>
                )}
                {stay.hotel_phone && (
                  <p className="mb-1">
                    <span className="font-medium">Phone: </span>
                    {stay.hotel_phone}
                  </p>
                )}
                {stay.cost && (
                  <p className="mb-1">
                    <span className="font-medium">Cost: </span>
                    {CURRENCY_SYMBOLS[stay.currency] || '$'}{Number(stay.cost).toLocaleString()}
                  </p>
                )}
                {stay.hotel_details && (
                  <p className="mb-1">
                    <span className="font-medium">Details: </span>
                    {stay.hotel_details}
                  </p>
                )}
              </div>

              {stay.hotel_website && (
                <a 
                  href={stay.hotel_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 inline-block mt-2"
                >
                  Visit hotel website
                </a>
              )}
            </div>

            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onEdit(stay.stay_id)}
                aria-label="Edit accommodation"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onDelete(stay.stay_id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                aria-label="Delete accommodation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex mt-3 space-x-2">
            <div className="flex-1 bg-green-50 text-green-700 text-xs rounded p-2">
              <span className="font-medium">Check-in:</span> {formatDateTime(stay.checkin_time)}
            </div>
            <div className="flex-1 bg-amber-50 text-amber-700 text-xs rounded p-2">
              <span className="font-medium">Check-out:</span> {formatDateTime(stay.checkout_time)}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default HotelStaysList;
