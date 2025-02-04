import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface EventHeaderProps {
  date: string;
  title: string;
  onEdit: () => void;
  onDelete?: () => void;
}

const EventHeader: React.FC<EventHeaderProps> = ({ date, title, onEdit, onDelete }) => {
  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <div className="text-sm font-medium text-earth-600 mb-1">
          {date}
        </div>
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-8 w-8 hover:bg-gray-100"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default EventHeader;