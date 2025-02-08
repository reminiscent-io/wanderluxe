import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Utensils } from "lucide-react";
import ActivityDialogs from './ActivityDialogs';
import DiningList from '../DiningList';

interface DayCardContentProps {
  index: number;
  reservations?: Array<{
    id: string;
    restaurant: string;
    time: string;
  }>;
  title: string;
  activities: Array<{
    id: string;
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    currency?: string;
  }>;
  onAddActivity: () => void;
  onEditActivity: (id: string) => void;
  formatTime: (time?: string) => string;
  dayId: string;
  eventId: string;
}

const DayCardContent: React.FC<DayCardContentProps> = ({
  index,
  title,
  activities,
  reservations,
  onAddActivity,
  onEditActivity,
  formatTime,
  dayId,
  eventId,
}) => {
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState({ text: "", cost: "", currency: "USD" });
  const [activityEdit, setActivityEdit] = useState({ text: "", cost: "", currency: "USD" });

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Activities</h3>
        <Button
          onClick={() => setIsAddingActivity(true)}
          variant="ghost"
          size="sm"
          className="text-earth-600 hover:text-earth-700 hover:bg-earth-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Activity
        </Button>
      </div>

      {activities.length > 0 ? (
        <ul className="space-y-2">
          {activities.sort((a, b) => {
            const timeA = a.start_time || '';
            const timeB = b.start_time || '';
            if (timeA === '' && timeB === '') return 0;
            if (timeA === '') return 1;
            if (timeB === '') return -1;
            return new Date(`2000-01-01T${timeA}`).getTime() - new Date(`2000-01-01T${timeB}`).getTime();
          }).map((activity) => (
            <li key={activity.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
              <span>{activity.title}</span>
              {activity.start_time && (
                <span className="text-sm text-gray-500">
                  {formatTime(activity.start_time)}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center py-4">No activities planned yet</p>
      )}

      <div className="mt-8">
        <DiningList
          reservations={(reservations || []).sort((a, b) => {
            if (!a.reservation_time && !b.reservation_time) return 0;
            if (!a.reservation_time) return 1;
            if (!b.reservation_time) return -1;
            return new Date(`2000-01-01T${b.reservation_time}`).getTime() - 
                   new Date(`2000-01-01T${a.reservation_time}`).getTime();
          })}
          formatTime={formatTime}
          dayId={dayId}
          onAddReservation={() => {}}
        />
      </div>

      <ActivityDialogs
        isAddingActivity={isAddingActivity}
        setIsAddingActivity={setIsAddingActivity}
        editingActivity={editingActivity}
        setEditingActivity={setEditingActivity}
        newActivity={newActivity}
        setNewActivity={setNewActivity}
        activityEdit={activityEdit}
        setActivityEdit={setActivityEdit}
        onAddActivity={onAddActivity}
        onEditActivity={onEditActivity}
        eventId={eventId}
      />
    </div>
  );
};

export default DayCardContent;