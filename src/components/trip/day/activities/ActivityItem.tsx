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
  // Convert cost to formatted string if cost is not null
  const formattedCost =
    activity.cost !== null
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: activity.currency || 'USD',
        }).format(activity.cost)
      : null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Activity item clicked:", activity);
        onEditClick(activity);
      }}
      className="bg-white p-3 rounded-md border border-gray-100 shadow-sm hover:bg-gray-50 cursor-pointer transition-colors w-full text-left"
    >
      <div className="flex items-center justify-between">
        <h5 className="font-medium text-gray-900">{activity.title}</h5>
        {formattedCost && (
          <span className="text-sm text-gray-500">
            {formattedCost}
          </span>
        )}
      </div>
      {(activity.start_time || activity.end_time) && (
        <p className="text-sm text-gray-500 mt-1">
          {activity.start_time && formatTime(activity.start_time)}
          {activity.start_time && activity.end_time && " - "}
          {activity.end_time && formatTime(activity.end_time)}
        </p>
      )}
      {activity.description && (
        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
      )}
    </button>

  );
};

export default ActivityItem;
