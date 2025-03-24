import React from 'react';
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, Pencil } from "lucide-react";

import { CURRENCIES, CURRENCY_NAMES, CURRENCY_SYMBOLS } from '@/utils/currencyConstants';

interface ActivityItemProps {
  activity: {
    order_index: number;
    id: string;
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    currency?: string;
  };
  onEdit: () => void;
  formatTime: (time?: string) => string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, onEdit, formatTime }) => {
  return (
    <div className="group relative p-4 bg-sand-50 rounded-lg space-y-2 hover:bg-sand-100 transition-colors">
      <div className="flex justify-between items-start">
        <h4 className="font-medium">{activity.title}</h4>
        <Button
          aria-label={`Edit ${activity.title}`}
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
        >
          <Pencil className="h-4 w-4 text-earth-500" />
        </Button>
      </div>
      {activity.description && (
        <p className="text-sm text-gray-600">{activity.description}</p>
      )}
      <div className="flex gap-4 text-sm text-gray-500">
        {(activity.start_time || activity.end_time) && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              {activity.start_time && formatTime(activity.start_time)}
              {activity.end_time && ` - ${formatTime(activity.end_time)}`}
            </span>
          </div>
        )}
        {activity.cost && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span>
              {activity.cost} {activity.currency || 'USD'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityItem;
