import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { format } from 'date-fns';

interface DayHeaderProps {
  date: string;
  dayNumber: number;
  onEdit: () => void;
  onDelete: () => void;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  date,
  dayNumber,
  onEdit,
  onDelete,
}) => {
  const formattedDate = format(new Date(date), 'EEEE, MMMM d, yyyy');

  return (
    <div className="relative p-4 bg-gradient-to-b from-black/50 to-transparent text-white">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-sm font-medium">Day {dayNumber}</span>
          <h3 className="text-2xl font-bold mt-1">{formattedDate}</h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/20 hover:bg-white/30"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/20 hover:bg-white/30 hover:text-red-500"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DayHeader;