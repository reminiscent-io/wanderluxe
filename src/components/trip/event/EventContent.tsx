import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
  handleAddActivity: (activity: { text: string; cost: string; currency: string }) => void;
  editingActivity: string | null;
  onEditingActivityChange: (id: string | null) => void;
  activityEdit: { text: string; cost: string; currency: string };
  onActivityEditChange: (edit: { text: string; cost: string; currency: string }) => void;
  handleEditActivity: (id: string) => void;
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
  handleAddActivity,
  editingActivity,
  onEditingActivityChange,
  activityEdit,
  onActivityEditChange,
  handleEditActivity,
}) => {
  const isCheckoutDay = hotelCheckoutDate === date;

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
            hotelUrl={hotelUrl}
            checkinDate={hotelCheckinDate}
            checkoutDate={hotelCheckoutDate}
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
          handleAddActivity={handleAddActivity}
          editingActivity={editingActivity}
          onEditingActivityChange={onEditingActivityChange}
          activityEdit={activityEdit}
          onActivityEditChange={onActivityEditChange}
          handleEditActivity={handleEditActivity}
        />
      </div>
    </div>
  );
};

export default EventContent;