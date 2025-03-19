import React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { format, parseISO, isValid } from 'date-fns';

interface HotelStayCardProps {
  stay: {
    stay_id: string;
    hotel: string;
    hotel_details?: string;
    hotel_url?: string;
    hotel_checkin_date: string;
    hotel_checkout_date: string;
  };
  onEdit: (stayId: string) => void;
  onDelete: (stayId: string) => void;
  formatDateRange: (checkinDate: string, checkoutDate: string) => string;
}

const HotelStayCard: React.FC<HotelStayCardProps> = ({
  stay,
  onEdit,
  onDelete,
  formatDateRange,
}) => {
  // Safe date range generation with validation
  const getDatesInRange = (startDate: string, endDate: string) => {
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      
      if (!isValid(start) || !isValid(end) || start > end) {
        console.warn('Invalid date range provided.');
        return [];
      }

      const dates: Date[] = [];
      for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
        dates.push(new Date(current));
      }
      
      return dates;
    } catch (error) {
      console.error('Error generating date range:', error);
      return [];
    }
  };

  const stayDates = getDatesInRange(
    stay.hotel_checkin_date, 
    stay.hotel_checkout_date
  );

  const handleDelete = () => {
    onDelete(stay.stay_id);
  };

  // Safe date formatting helper
  const safeFormatDate = (dateString: string, formatStr: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, formatStr) : 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm">
      <Calendar className="h-5 w-5 text-gray-500 mt-1" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">{stay.hotel}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {safeFormatDate(stay.hotel_checkin_date, 'MMM d, yyyy')} - {' '}
              {safeFormatDate(stay.hotel_checkout_date, 'MMM d, yyyy')}
            </p>
            {stay.hotel_details && (
              <p className="text-sm text-gray-600 mt-1">{stay.hotel_details}</p>
            )}
            {stay.hotel_url && (
              <a 
                href={stay.hotel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
              >
                View Hotel <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(stay.stay_id)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-1">Daily Schedule:</p>
          <div className="space-y-1">
            {stayDates.map((date, index) => {
              const isValidDate = isValid(date);
              return (
                <p 
                  key={isValidDate ? date.toISOString() : `invalid-${index}`}
                  className="text-xs text-gray-500"
                >
                  {isValidDate 
                    ? format(date, 'EEEE, MMMM d, yyyy') 
                    : 'Invalid date entry'}
                  {index === 0 && " (Check-in)"}
                  {index === stayDates.length - 1 && " (Check-out)"}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelStayCard;