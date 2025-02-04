import React from 'react';
import { Button } from "@/components/ui/button";
import { format, parseISO } from 'date-fns';
import { Pencil, Trash2 } from "lucide-react";

interface DayHeaderProps {
  date: string;
  dayNumber: number;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  date,
  dayNumber,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="flex justify-between items-center p-4 bg-earth-50">
      <div>
        <h3 className="text-lg font-semibold">Day {dayNumber}</h3>
        <p className="text-sm text-gray-600">
          {format(parseISO(date), 'EEEE, MMMM do')}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-8 w-8"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-red-500 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DayHeader;