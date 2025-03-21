import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Plus } from "lucide-react";
import { DayActivity } from '@/types/trip';
import { formatTime as defaultFormatTime } from '@/utils/timeFormatter';

interface ActivitiesListProps {
  activities: DayActivity[];
  onAddActivity: () => void;
  onEditActivity: (activity: DayActivity) => void;
  formatTime?: (time?: string) => string;
}

const ActivitiesList: React.FC<ActivitiesListProps> = ({
  activities,
  onAddActivity,
  onEditActivity,
  formatTime: customFormatTime,
}) => {
  // Use either provided format function or our default
  const timeFormatter = customFormatTime || defaultFormatTime;

  const handleActivityClick = (activity: DayActivity) => {
    console.log("Activity item clicked:", activity);
    onEditActivity(activity);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Activities</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddActivity}
          className="text-white hover:bg-white/20"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-2">
        {activities && activities.length > 0 ? (
          activities.map((activity) => (
            <div
              key={activity.id || `temp-${activity.title}-${activity.created_at}`}
              className="flex justify-between items-center p-3
                         bg-white rounded-lg shadow-sm 
                         hover:bg-gray-50 cursor-pointer"
              onClick={() => handleActivityClick(activity)}
            >
              <div>
                <h4 className="font-medium text-gray-900">{activity.title}</h4>
                {activity.start_time && (
                  <p className="text-sm text-gray-500">
                    {timeFormatter(activity.start_time)}
                    {activity.end_time && ` - ${timeFormatter(activity.end_time)}`}
                  </p>
                )}
                {activity.cost && (
                  <p className="text-sm text-gray-500">
                    {activity.cost} {activity.currency || 'USD'}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleActivityClick(activity);
                }}
                className="text-gray-600 hover:bg-gray-200"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-gray-500">
            <p className="text-sm">No activities scheduled yet.</p>
            <Button 
              variant="ghost" 
              onClick={onAddActivity}
              className="mt-2 text-sm text-blue-500 hover:text-blue-700"
            >
              Add an activity
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivitiesList;