import React from 'react';
import { HotelStay } from '@/types/trip';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { CURRENCY_SYMBOLS } from '@/utils/currencyConstants';
import { formatDateRange } from '@/utils/formatDateRange';

interface HotelStaysListProps {
  hotelStays: HotelStay[];
  onEdit: (stayId: string) => void;
  onDelete: (stayId: string) => void;
}

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

  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return dateString;
    }
  };

  return (
    <div className="space-y-3 p-2 sm:p-4">
      {hotelStays.map((stay) => (
        <Card 
          key={stay.stay_id} 
          className="p-3 sm:p-4 bg-white hover:shadow-md transition-shadow"
        >
          {/* Mobile-first layout with responsive adjustments */}
          <div className="space-y-3">
            {/* Header with hotel name and actions */}
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 flex-1 min-w-0">
                {stay.hotel}
              </h3>
              <div className="flex space-x-1 flex-shrink-0">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onEdit(stay.stay_id)}
                  aria-label="Edit accommodation"
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onDelete(stay.stay_id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                  aria-label="Delete accommodation"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Check-in/Check-out dates - prominent display */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 text-green-700 text-xs rounded p-2">
                <div className="font-medium">Check-in:</div>
                <div>{formatDate(stay.hotel_checkin_date)}</div>
              </div>
              <div className="bg-amber-50 text-amber-700 text-xs rounded p-2">
                <div className="font-medium">Check-out:</div>
                <div>{formatDate(stay.hotel_checkout_date)}</div>
              </div>
            </div>

            {/* Hotel details - condensed layout */}
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-medium text-xs text-gray-500">Nights:</span>
                <span className="text-xs">
                  {formatDateRange(stay.hotel_checkin_date, stay.hotel_checkout_date)}
                </span>
              </div>

              {stay.hotel_address && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                  <span className="font-medium text-xs text-gray-500 flex-shrink-0">Address:</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.hotel_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-xs leading-tight break-words"
                  >
                    {stay.hotel_address}
                  </a>
                </div>
              )}

              {/* Secondary info in a more compact layout */}
              <div className="flex flex-wrap gap-3 text-xs">
                {stay.hotel_phone && (
                  <div>
                    <span className="font-medium text-gray-500">Phone:</span> {stay.hotel_phone}
                  </div>
                )}
                {stay.cost && (
                  <div>
                    <span className="font-medium text-gray-500">Cost:</span> 
                    {CURRENCY_SYMBOLS[stay.currency] || '$'}{Number(stay.cost).toLocaleString()}
                  </div>
                )}
              </div>

              {stay.hotel_details && (
                <div className="text-xs">
                  <span className="font-medium text-gray-500">Details:</span> {stay.hotel_details}
                </div>
              )}

              {stay.hotel_website && (
                <a 
                  href={stay.hotel_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 inline-block"
                >
                  Visit hotel website
                </a>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default HotelStaysList;
