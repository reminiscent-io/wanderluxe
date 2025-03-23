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
  onEdit: () => void;
  onDelete: () => void;
}

const TransportationListItem: React.FC<TransportationListItemProps> = ({
  transportation,
  onEdit,
  onDelete
}) => {
  const getTransportationType = (type: string | null) => {
    if (!type) return 'Transportation';

    // Convert snake_case to Title Case
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    try {
      return format(new Date(date), 'MMM d, yyyy');
    } catch (error) {
      return date;
    }
  };

  const formatCost = (cost: number | null) => {
    if (cost === null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: transportation.currency || 'USD'
    }).format(cost);
  };

  return (
    <Card className="p-4 rounded-lg shadow-sm">
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
              {formatDate(transportation.start_date)}
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
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={onDelete}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TransportationListItem;