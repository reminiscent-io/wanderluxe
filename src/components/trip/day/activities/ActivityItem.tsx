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
      className="bg-white p-3 rounded-md border border-gray-100 shadow-sm hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Activity item clicked:", activity);
        if (typeof onEditClick === 'function') {
          // Pass the activity so that the caller can extract the ID if needed.
          onEditClick(activity);
        } else {
          console.error('onEditClick is not a function', { onEditClick });
        }
      }}
    >
      <div className="flex justify-between">
        <h5 className="font-medium text-gray-900">{activity.title}</h5>
        {activity.cost !== null && (
          <span className="text-sm text-gray-500">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: activity.currency || 'USD',
            }).format(activity.cost)}
          </span>
        )}
      </div>
      {(activity.start_time || activity.end_time) && (
        <p className="text-sm text-gray-500">
          {activity.start_time && formatTime(activity.start_time)}
          {activity.start_time && activity.end_time && ' - '}
          {activity.end_time && formatTime(activity.end_time)}
        </p>
      )}
      {activity.description && (
        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
      )}
    </li>
  );
};

export default ActivityItem;
