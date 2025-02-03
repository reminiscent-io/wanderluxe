import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface EventHeaderProps {
  date: string;
  title: string;
  onEdit: () => void;
}

const EventHeader: React.FC<EventHeaderProps> = ({ date, title, onEdit }) => {
  return (
    <div className="flex justify-between items-start mb-4">
      <div>
        <div className="text-sm font-semibold text-earth-500 mb-2">
          {date}
        </div>
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
      </div>
      <Button variant="outline" size="icon" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default EventHeader;