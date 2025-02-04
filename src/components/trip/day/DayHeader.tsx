import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { parseISO, format } from 'date-fns';

interface DayHeaderProps {
  date: string;
  onEdit: () => void;
  onDelete: () => void;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  date,
  onEdit,
  onDelete,
}) => {
  // Parse the date string and format it without timezone consideration
  const formattedDate = format(parseISO(date), 'EEEE, MMMM d, yyyy');

  return (
    <>
      <div className="text-center text-sm font-medium text-earth-500 mb-2">
        {formattedDate}
      </div>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="bg-white/80 hover:bg-white/90"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="bg-white/80 hover:bg-white/90 hover:text-red-500"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
};

export default DayHeader;