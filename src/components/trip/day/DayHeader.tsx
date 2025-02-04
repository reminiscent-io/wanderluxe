import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { format, parseISO } from 'date-fns';
import { Pencil, Trash2 } from "lucide-react";
import DayEditDialog from './DayEditDialog';

interface DayHeaderProps {
  date: string;
  dayNumber: number;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  dayId: string;
  title?: string;
  activities: Array<{
    id: string;
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    currency?: string;
  }>;
  formatTime: (time?: string) => string;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  date,
  dayNumber,
  onDelete,
  dayId,
  title = "",
  activities,
  formatTime,
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <>
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
            onClick={() => setIsEditDialogOpen(true)}
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

      <DayEditDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        dayId={dayId}
        currentTitle={title}
        date={date}
        activities={activities}
        formatTime={formatTime}
      />
    </>
  );
};

export default DayHeader;