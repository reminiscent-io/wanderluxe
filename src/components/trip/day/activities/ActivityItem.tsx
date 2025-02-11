
import React from 'react';
import { DayActivity } from '@/types/trip';

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
    <li 
      className="flex justify-between items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
      onClick={() => onEditClick(activity)}
    >
      <span>{activity.title}</span>
      {activity.start_time && (
        <span className="text-sm text-gray-500">
          {formatTime(activity.start_time)}
        </span>
      )}
    </li>
  );
};

export default ActivityItem;
