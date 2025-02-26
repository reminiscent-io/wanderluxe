
import React from 'react';
import { DayActivity } from '@/types/trip';
import { Button } from "@/components/ui/button";

interface ActivityItemProps {
  activity: DayActivity;
  formatTime: (time?: string) => string;
  onEditClick: (activity: DayActivity) => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  formatTime,
  onEditClick,
}) => {
  return (
    <li className="flex justify-between items-center p-2">
      <Button
        variant="ghost"
        className="w-full flex justify-between items-center hover:bg-gray-50 rounded"
        onClick={() => onEditClick(activity)}
      >
        <span>{activity.title}</span>
        {activity.start_time && (
          <span className="text-sm text-gray-500">
            {formatTime(activity.start_time)}
          </span>
        )}
      </Button>
    </li>
  );
};

export default ActivityItem;
