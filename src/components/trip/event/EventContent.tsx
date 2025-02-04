import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import EventHeader from './EventHeader';
import EventAccommodation from './EventAccommodation';
import EventActivitiesList from './EventActivitiesList';

interface EventContentProps {
  date: string;
  title: string;
  description: string;
  hotel?: string;
  hotelDetails?: string;
  hotelUrl?: string;
  hotelCheckinDate?: string;
  hotelCheckoutDate?: string;
  activities: Array<{ id: string; text: string; cost?: number; currency?: string }>;
  onEdit: () => void;
  isAddingActivity: boolean;
  onAddingActivityChange: (isAdding: boolean) => void;
  newActivity: { text: string; cost: string; currency: string };
  onNewActivityChange: (activity: { text: string; cost: string; currency: string }) => void;
  onAddActivity: () => void;
  editingActivity: string | null;
  onEditingActivityChange: (id: string | null) => void;
  activityEdit: { text: string; cost: string; currency: string };
  onActivityEditChange: (edit: { text: string; cost: string; currency: string }) => void;
  onEditActivity: (id: string) => void;
  isCheckoutDay: boolean;
  eventId: string;
}

const EventContent: React.FC<EventContentProps> = ({
  date,
  title,
  description,
  hotel,
  hotelDetails,
  hotelUrl,
  hotelCheckinDate,
  hotelCheckoutDate,
  activities,
  onEdit,
  isAddingActivity,
  onAddingActivityChange,
  newActivity,
  onNewActivityChange,
  onAddActivity,
  editingActivity,
  onEditingActivityChange,
  activityEdit,
  onActivityEditChange,
  onEditActivity,
  isCheckoutDay,
  eventId,
}) => {
  return (
    <div className="p-6 flex flex-col h-full bg-white">
      <EventHeader
        date={date}
        title={title}
        onEdit={onEdit}
      />
      
      <div className="space-y-6 flex-grow">
        {description && (
          <p className="text-gray-600 leading-relaxed">
            {description}
          </p>
        )}

        {hotel && (
          <EventAccommodation
            hotel={hotel}
            hotelDetails={hotelDetails || ''}
            hotelUrl={hotelUrl || ''}
            hotelCheckinDate={hotelCheckinDate || ''}
            hotelCheckoutDate={hotelCheckoutDate || ''}
          />
        )}

        <EventActivitiesList
          activities={activities}
          isCheckoutDay={isCheckoutDay}
          hotel={hotel}
          isAddingActivity={isAddingActivity}
          onAddingActivityChange={onAddingActivityChange}
          newActivity={newActivity}
          onNewActivityChange={onNewActivityChange}
          onAddActivity={onAddActivity}
          editingActivity={editingActivity}
          onEditingActivityChange={onEditingActivityChange}
          activityEdit={activityEdit}
          onActivityEditChange={onActivityEditChange}
          onEditActivity={onEditActivity}
          eventId={eventId}
        />
      </div>
    </div>
  );
};

export default EventContent;