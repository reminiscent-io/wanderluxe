
import React, { useState } from 'react';
import { CollapsibleContent } from "@/components/ui/collapsible";
import DayLayout from '../DayLayout';
import { DayActivity, ActivityFormData } from '@/types/trip';
import DayCardContent from '../DayCardContent';
import ActivityDialogs from '../ActivityDialogs';

interface DayCollapsibleContentProps {
  title: string;
  activities: DayActivity[];
  reservations?: Array<{
    id: string;
    day_id: string;
    restaurant_name: string;
    reservation_time?: string;
    number_of_people?: number;
    confirmation_number?: string;
    notes?: string;
    cost?: number;
    currency?: string;
    address?: string;
    phone_number?: string;
    website?: string;
    rating?: number;
    created_at: string;
    order_index: number;
  }>;
  index: number;
  onAddActivity: (activity: ActivityFormData) => Promise<void>;
  onEditActivity?: (activityId: string) => void;
  formatTime: (time?: string) => string;
  dayId: string;
  tripId: string;
  imageUrl?: string;
  defaultImageUrl?: string;
}

const DayCollapsibleContent: React.FC<DayCollapsibleContentProps> = ({
  title,
  activities,
  reservations,
  index,
  onAddActivity,
  onEditActivity,
  formatTime,
  dayId,
  tripId,
  imageUrl,
  defaultImageUrl,
}) => {
  // State for managing activity operations
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState<ActivityFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD'
  });
  const [activityEdit, setActivityEdit] = useState<ActivityFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD'
  });

  const handleEditActivityWrapper = (activityId: string) => {
    console.log("Activity edit requested in DayCollapsibleContent with ID:", activityId);
    
    if (!activityId) {
      console.error('Activity ID is missing in DayCollapsibleContent');
      return;
    }
    
    // Set the editing state regardless of the parent handler
    setEditingActivity(activityId);
    
    // Find the activity and populate the edit form
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      setActivityEdit({
        title: activity.title || '',
        description: activity.description || '',
        start_time: activity.start_time || '',
        end_time: activity.end_time || '',
        cost: activity.cost ? String(activity.cost) : '',
        currency: activity.currency || 'USD'
      });
    } else {
      console.error('Activity not found for ID:', activityId);
    }
    
    // Call the parent handler if it exists
    if (typeof onEditActivity === 'function') {
      onEditActivity(activityId);
    }
  };

  return (
    <CollapsibleContent className="border-t">
      <DayLayout imageUrl={imageUrl} defaultImageUrl={defaultImageUrl || ''} dayId={dayId} title={title}>
        <DayCardContent
          index={index}
          title={title}
          activities={activities}
          reservations={reservations}
          onAddActivity={onAddActivity}
          onEditActivity={handleEditActivityWrapper}
          formatTime={formatTime}
          dayId={dayId}
          eventId={tripId}
        />
      </DayLayout>
      
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
        onEditActivity={(id: string) => {
          if (typeof onEditActivity === 'function' && id) {
            onEditActivity(id);
          }
        }}
        eventId={tripId}
      />
    </CollapsibleContent>
  );
};

export default DayCollapsibleContent;
