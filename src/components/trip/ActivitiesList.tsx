import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ActivityItem from './ActivityItem';

interface ActivitiesListProps {
  activities: Array<{
    id: string;
    day_id: string;
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    currency?: string;
    order_index: number;
    created_at: string;
  }>;
  onAddActivity: () => void;
  onEditActivity: (id: string) => void;
  formatTime: (time?: string) => string;
}

const ActivitiesList: React.FC<ActivitiesListProps> = ({
  activities,
  onAddActivity,
  onEditActivity,
  formatTime,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-earth-500">Activities</h4>
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

      <div className="space-y-2">
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onEdit={() => onEditActivity(activity.id)}
            formatTime={formatTime}
          />
        ))}
      </div>
    </div>
  );
};

export default ActivitiesList;
