import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TransportationListItemProps {
  transportation: any;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
  onClick?: () => void;
}

const TransportationListItem: React.FC<TransportationListItemProps> = ({
  transportation,
  onEdit,
  onDelete,
  compact = false,
  onClick
}) => {
  const {
    type,
    departure_location,
    arrival_location,
    start_date,
    provider
  } = transportation;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const getTypeLabel = () => {
    const types: Record<string, string> = {
      'flight': 'Flight',
      'train': 'Train',
      'bus': 'Bus',
      'car': 'Car',
      'ferry': 'Ferry',
      'other': 'Other'
    };
    return types[type] || 'Transportation';
  };

  const isClickable = !!onClick;
  const className = `p-4 bg-white ${isClickable ? 'cursor-pointer hover:bg-gray-50' : ''}`;

  if (compact) {
    return (
      <div 
        className={className}
        onClick={onClick}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{departure_location} to {arrival_location}</span>
              <Badge variant="outline" className="text-xs">{getTypeLabel()}</Badge>
            </div>
            {start_date && (
              <div className="text-sm text-gray-500">{formatDate(start_date)}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="shadow-sm mb-3 hover:bg-gray-50" onClick={onClick}>
      <div className="p-4 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {departure_location} to {arrival_location}
            </span>
            <Badge variant="outline" className="text-xs">
              {getTypeLabel()}
            </Badge>
          </div>
          <div className="flex flex-col text-sm text-gray-500">
            {provider && <span>{provider}</span>}
            {start_date && <span>{formatDate(start_date)}</span>}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex space-x-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this transportation?')) {
                    onDelete();
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TransportationListItem;