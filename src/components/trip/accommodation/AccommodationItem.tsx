
import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';

interface AccommodationItemProps {
  stay: any;
  onEdit: () => void;
  onDelete: () => void;
}

const AccommodationItem: React.FC<AccommodationItemProps> = ({ stay, onEdit, onDelete }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  return (
    <div className="flex items-start justify-between p-4 border rounded-lg bg-white hover:shadow-sm transition-all">
      <div className="flex-1">
        <div className="font-medium text-gray-700">{stay.hotel}</div>
        <div className="text-sm text-gray-500">
          {formatDate(stay.hotel_checkin_date)} - {formatDate(stay.hotel_checkout_date)}
        </div>
        {stay.cost && (
          <div className="text-sm text-gray-600 mt-1">
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
