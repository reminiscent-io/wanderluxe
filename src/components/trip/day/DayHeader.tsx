import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { format, parseISO } from 'date-fns';
import { Pencil } from "lucide-react";
import DayEditDialog from './DayEditDialog';
import { toast } from 'sonner';

interface DayHeaderProps {
  date: string;
  dayNumber: number;
  onEdit: () => void;
  dayId: string;
  title?: string;
  activities: any[];
  formatTime: (time?: string) => string;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  date,
  dayNumber,
  onEdit,
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
          <div
            role="button"
            onClick={() => setIsEditDialogOpen(true)}
            className="h-8 w-8 bg-transparent hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer flex items-center justify-center"
          >
            <Pencil className="h-4 w-4" />
          </div>
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