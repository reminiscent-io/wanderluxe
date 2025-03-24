import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';

type TransportationEvent = Tables<'transportation_events'>;

interface TransportationListItemProps {
  transportation: TransportationEvent;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  compact?: boolean;
}

const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
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
  return type.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
            {transportation.start_time ? ` at ${transportation.start_time}` : ''}
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
    <Card className="p-4 rounded-lg shadow-sm bg-earth-500/10">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium">
                {transportation.departure_location} to {transportation.arrival_location}
              </h3>
              <Badge variant="outline" className="capitalize">
                {getTransportationType(transportation.type)}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              {transportation.start_date ? formatDate(transportation.start_date) : 'Date missing'}
              {transportation.start_time ? ` at ${transportation.start_time}` : ''}
            </p>
            {transportation.provider && (
              <p className="text-sm text-gray-500">Provider: {transportation.provider}</p>
            )}
            {transportation.details && (
              <p className="text-sm mt-1">{transportation.details}</p>
            )}
            {transportation.cost !== null && (
              <p className="text-sm font-medium mt-1">{formatCost(transportation.cost)}</p>
            )}
          </div>
          <div className="flex space-x-1">
            {onEdit && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-red-500"
                onClick={onDelete}
              >
                <Trash className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TransportationListItem;