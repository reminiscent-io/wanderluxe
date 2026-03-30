
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/dateUtils';

interface AccommodationItemProps {
  stay: any;
  onEdit: () => void;
  onDelete: () => void;
}

const AccommodationItem: React.FC<AccommodationItemProps> = ({ stay, onEdit, onDelete }) => {
  return (
    <div className="flex items-start justify-between p-4 border rounded-lg bg-background hover:shadow-warm-sm transition-all">
      <div className="flex-1">
        <div className="font-medium text-earth-700">{stay.hotel}</div>
        <div className="text-sm text-muted-foreground">
          {formatDate(stay.hotel_checkin_date)} - {formatDate(stay.hotel_checkout_date)}
        </div>
        {stay.cost && (
          <div className="text-sm text-earth-600 mt-1">
            {formatCurrency(stay.cost, stay.currency)}
          </div>
        )}
      </div>
      <div className="flex space-x-2">
        <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
          <Edit size={16} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-red-500 hover:text-red-600">
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
};

export default AccommodationItem;
