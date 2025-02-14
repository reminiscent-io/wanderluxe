
import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

interface TimelineActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  isRefreshing: boolean;
}

const TimelineActions: React.FC<TimelineActionsProps> = ({
  onEdit,
  onDelete,
  isRefreshing
}) => {
  return (
    <div className="absolute right-0 top-0 flex gap-2 z-10">
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="bg-white/80 backdrop-blur-sm hover:bg-white"
          disabled={isRefreshing}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="bg-white/80 backdrop-blur-sm hover:bg-white/90"
          disabled={isRefreshing}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default TimelineActions;
