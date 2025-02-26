
import React from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DayActivity } from '@/types/trip';

interface DayHeaderProps {
  date: string;
  dayNumber: number;
  onEdit: () => void;
  onDelete?: () => void;
  dayId: string;
  title?: string;
  activities: DayActivity[];
  formatTime: (time?: string) => string;
  canDelete?: boolean;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  date,
  dayNumber,
  onEdit,
  onDelete,
  dayId,
  title,
  activities,
  formatTime,
  canDelete = false
}) => {
  const formattedDate = format(parseISO(date), 'EEEE, MMMM d');

  return (
    <div className="flex items-center justify-between p-4 bg-sand-50/50">
      <div>
        <div className="flex items-baseline gap-2">
          <h3 className="font-bold">Day {dayNumber}</h3>
          <span className="text-sm text-gray-600">{formattedDate}</span>
        </div>
        {title && <p className="text-sm mt-1 text-gray-600">{title}</p>}
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="h-8 w-8"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {canDelete && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-8 w-8 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default DayHeader;
