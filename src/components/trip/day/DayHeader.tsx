import React from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface DayHeaderProps {
  title: string;
  date: string;
  isOpen?: boolean;
  onEdit: () => void;
  onDelete?: () => void;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  title,
  date,
  isOpen = false,
  onEdit,
  onDelete
}) => {
  const formattedDate = format(parseISO(date), 'EEEE, MMMM d');

  return (
    <CollapsibleTrigger asChild>
      <div className="w-full px-4 py-3 flex items-center justify-between bg-sand-50/50 hover:bg-sand-100/70 transition-colors cursor-pointer">
        <div>
          <div className="flex flex-col gap-2">
            <span className="text-lg font-medium text-gray-600">{formattedDate}</span>
            <h3 className="font-medium text-base text-gray-600">{title}</h3>
          </div>
        </div>
        <div onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "transform rotate-180"
            )} />
          </div>
        </div>
      </div>
    </CollapsibleTrigger>
  );
};

export default DayHeader;