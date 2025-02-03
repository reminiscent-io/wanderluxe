import React from 'react';
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
  handleAddActivity: () => void;
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
  const isCheckoutDay = hotel && hotelCheckoutDate === date;

  return (
    <div className="p-6 flex flex-col justify-between">
      <div>
        <EventHeader
          date={date}
          title={title}
          onEdit={onEdit}
        />
        
        <p className="text-gray-600 mb-4">{description}</p>
        
        {(hotel && date >= hotelCheckinDate! && date < hotelCheckoutDate!) && (
          <EventAccommodation
            hotel={hotel}
            hotelDetails={hotelDetails}
            hotelUrl={hotelUrl}
          />
        )}
        
        <EventActivitiesList
          activities={activities}
          isCheckoutDay={isCheckoutDay}
          hotel={hotel}
          onAddActivity={() => onAddingActivityChange(true)}
          onEditActivity={(activity) => {
            onEditingActivityChange(activity.id);
            onActivityEditChange({
              text: activity.text,
              cost: activity.cost?.toString() || "",
              currency: activity.currency || "USD"
            });
          }}
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