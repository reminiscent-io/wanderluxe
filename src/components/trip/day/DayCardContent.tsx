import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DiningList from '../DiningList';
import { Skeleton } from "@/components/ui/skeleton";

interface DayCardContentProps {
  index: number;
  title: string;
  activities: Array<{
    id: string;
    title: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    currency?: string;
  }>;
  onAddActivity: () => void;
  onEditActivity: (id: string) => void;
  formatTime: (time?: string) => string;
  dayId: string;
}

const DayCardContent: React.FC<DayCardContentProps> = ({
  index,
  title,
  activities,
  onAddActivity,
  onEditActivity,
  formatTime,
  dayId,
}) => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-2xl font-semibold">
          {title || <Skeleton className="h-8 w-48" />}
        </h3>
        <p className="text-sm text-gray-500 mt-1">Day {index + 1}</p>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-earth-500">Activities</h4>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAddActivity}
              className="text-earth-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </div>

          {activities.length === 0 ? (
            <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
              No activities planned yet
            </div>
          ) : (
            <ul className="space-y-2">
              {activities.map((activity) => (
                <li 
                  key={activity.id}
                  className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                  onClick={() => onEditActivity(activity.id)}
                >
                  <div>
                    <span className="font-medium">{activity.title}</span>
                    {activity.start_time && (
                      <span className="text-sm text-gray-500 ml-2">
                        {formatTime(activity.start_time)}
                      </span>
                    )}
                  </div>
                  {activity.cost && (
                    <span className="text-sm text-earth-500">
                      {activity.cost} {activity.currency}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <DiningList
          reservations={[]}
          onAddReservation={() => {}}
          formatTime={formatTime}
          dayId={dayId}
        />
      </div>
    </div>
  );
};

export default DayCardContent;