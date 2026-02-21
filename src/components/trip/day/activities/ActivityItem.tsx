import React from 'react';
import { MapPin } from 'lucide-react';
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

        onEditClick(activity);
      }}
      className="bg-background p-3 rounded-md border border-[hsl(var(--border))] shadow-warm-sm hover:bg-secondary cursor-pointer transition-colors w-full text-left"
    >
      <div className="flex items-center justify-between">
        <h5 className="font-medium text-foreground">{activity.title}</h5>
        {formattedCost && (
          <span className="text-sm text-muted-foreground">
            {formattedCost}
          </span>
        )}
      </div>
      {(activity.start_time || activity.end_time) && (
        <p className="text-sm text-muted-foreground mt-1">
          {activity.start_time && formatTime(activity.start_time)}
          {activity.start_time && activity.end_time && " - "}
          {activity.end_time && formatTime(activity.end_time)}
        </p>
      )}
      {activity.location_address && (
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{activity.location_address}</span>
        </p>
      )}
      {activity.description && (
        <p className="text-sm text-earth-600 mt-1">{activity.description}</p>
      )}
    </button>

  );
};

export default ActivityItem;
