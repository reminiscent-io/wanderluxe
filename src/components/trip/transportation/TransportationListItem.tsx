import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, startOfDay } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';

type Transportation = Tables<'transportation'>;

interface TransportationListItemProps {
  transportation: Transportation;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  compact?: boolean;
}

const formatTime12 = (time?: string) => {
  if (!time) return "";
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minuteStr}${period}`;
};

const formatDate = (dateString: string) => {
  try {
    // Parse the date as ISO, normalize to start of day, then format
    return format(startOfDay(parseISO(dateString)), 'MMM d, yyyy');
  } catch (error) {
    return dateString;
  }
};

const formatCost = (cost: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cost);
};

const getTransportationType = (type: string | null) => {
  if (!type) return 'Unknown';
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper function to format time range
const formatTimeRange = (startTime?: string, endTime?: string) => {
  if (!startTime) return '';
  return endTime 
    ? `${formatTime12(startTime)} - ${formatTime12(endTime)}`
    : `${formatTime12(startTime)}`;
};

const TransportationListItem: React.FC<TransportationListItemProps> = ({
  transportation,
  onEdit,
  onDelete,
  onClick,
  compact = false
}) => {
  // Render compact version (for DayCard) when compact prop is true
  if (compact) {
    return (
      <Card 
        className="p-3 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <div>
          <h4 className="font-medium">
            {transportation.departure_location} to {transportation.arrival_location}
          </h4>
          <p className="text-sm text-gray-500">
            {transportation.start_date ? formatDate(transportation.start_date) : 'Date missing'}
            {transportation.start_time && ` ${formatTimeRange(transportation.start_time, transportation.end_time)}`}
          </p>
        </div>
      </Card>
    );
  }

  // Detailed view with edit and delete buttons
  if (!transportation || !transportation.type || !transportation.departure_location || !transportation.arrival_location) {
    return (
      <Card className="p-4 rounded-lg shadow-sm bg-earth-500/10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium">Transportation Details Incomplete</h3>
            <p className="text-sm text-gray-500">
              {transportation?.start_date ? formatDate(transportation.start_date) : 'Date missing'}
            </p>
          </div>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-red-500"
              onClick={onDelete}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-4 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Header with transportation type and actions */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Badge variant="secondary" className="capitalize flex-shrink-0 text-xs">
              {getTransportationType(transportation.type)}
            </Badge>
          </div>
          <div className="flex space-x-1 flex-shrink-0">
            {onEdit && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={onEdit}
                aria-label="Edit transportation"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={onDelete}
                aria-label="Delete transportation"
              >
                <Trash className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Route display - prominent From → To */}
        <div className="flex items-center gap-2 text-base sm:text-lg font-medium text-gray-900">
          <span className="truncate">{transportation.departure_location}</span>
          <span className="text-gray-400 flex-shrink-0">→</span>
          <span className="truncate">{transportation.arrival_location}</span>
        </div>

        {/* Date and time */}
        <div className="text-sm text-gray-600">
          {transportation.start_date ? formatDate(transportation.start_date) : 'Date missing'}
          {transportation.start_time && (
            <span className="ml-2 text-gray-500">
              {formatTimeRange(transportation.start_time, transportation.end_time)}
            </span>
          )}
        </div>

        {/* Additional details in compact layout */}
        <div className="space-y-1 text-sm">
          {transportation.provider && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-medium text-gray-500 text-xs">Provider:</span>
              <span className="text-xs">{transportation.provider}</span>
            </div>
          )}
          
          {transportation.cost !== null && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-medium text-gray-500 text-xs">Cost:</span>
              <span className="text-xs font-medium">{formatCost(transportation.cost)}</span>
            </div>
          )}

          {transportation.details && (
            <div className="text-xs text-gray-600 mt-2">
              <span className="font-medium text-gray-500">Details:</span> {transportation.details}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TransportationListItem;
