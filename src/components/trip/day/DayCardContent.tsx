import React from 'react';
import HotelInfo from '../HotelInfo';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface DayCardContentProps {
  index: number;
  title: string;
  hotelDetails?: {
    name: string;
    details: string;
  };
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
}

const DayCardContent: React.FC<DayCardContentProps> = ({
  title,
  hotelDetails,
  activities,
  onAddActivity,
  onEditActivity,
  formatTime,
}) => {
  return (
    <div className="p-6">
      {hotelDetails && (
        <HotelInfo
          name={hotelDetails.name}
          details={hotelDetails.details}
        />
      )}

      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-earth-500">Activities</h4>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onAddActivity}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>

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
      </div>
    </div>
  );
};

export default DayCardContent;