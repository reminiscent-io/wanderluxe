
import React from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DayHeaderProps {
  title: string;
  date: string;
  isOpen?: boolean;
  onEdit: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  title,
  date,
  isOpen = false,
  onEdit,
  onDelete,
  onToggle
}) => {
  const formattedDate = format(parseISO(date), 'EEEE, MMMM d');

  return (
    <div 
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle?.();
        }
      }}
      className="w-full px-4 py-3 flex items-center justify-between bg-black/30 backdrop-blur-sm hover:bg-black/40 transition-colors cursor-pointer z-10 relative"
    >
      <div>
        <div className="flex flex-col gap-2">
          <span className="text-lg font-medium text-white">{formattedDate}</span>
          <h3 className="font-medium text-base text-white">{title}</h3>
        </div>
      </div>
      <div 
        className="flex items-center gap-2"
        onClick={e => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={onEdit} 
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-700"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform duration-200 text-white",
          isOpen && "transform rotate-180"
        )} />
      </div>
    </div>
  );
};

export default DayHeader;
