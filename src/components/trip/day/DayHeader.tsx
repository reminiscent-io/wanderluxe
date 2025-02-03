import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface DayHeaderProps {
  date: string;
  index: number;
  title?: string;
  onEdit: () => void;
  onDelete: () => void;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  date,
  index,
  title,
  onEdit,
  onDelete,
}) => {
  return (
    <>
      <div className="text-center text-sm font-medium text-earth-500 mb-2">
        {new Date(date).toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
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
      <h3 className="text-2xl font-semibold mb-2">
        Day {index + 1}{title && `: ${title}`}
      </h3>
    </>
  );
};

export default DayHeader;