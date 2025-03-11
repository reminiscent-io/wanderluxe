import React from 'react';
import { CollapsibleContent } from "@/components/ui/collapsible";
import DayLayout from '../DayLayout';
import { DayActivity, ActivityFormData } from '@/types/trip';

interface DayCollapsibleContentProps {
  title: string;
  activities: DayActivity[];
  hotelDetails?: {
    name: string;
    details: string;
    imageUrl?: string;
  };
  index: number;
  onAddActivity: (activity: ActivityFormData) => Promise<void>;
  onEditActivity: (id: string) => void;
  formatTime: (time?: string) => string;
  dayId: string;
  tripId: string;
  imageUrl?: string | null;
  defaultImageUrl?: string;
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
}

const DayCollapsibleContent: React.FC<DayCollapsibleContentProps> = ({
  title,
  activities,
  hotelDetails,
  index,
  onAddActivity,
  onEditActivity,
  formatTime,
  dayId,
  tripId,
  imageUrl,
  defaultImageUrl,
  reservations
}) => {
  return (
    <CollapsibleContent className="p-4">
      <DayLayout
        title={title}
        activities={activities}
        hotelDetails={hotelDetails}
        index={index}
        onAddActivity={onAddActivity}
        onEditActivity={onEditActivity}
        formatTime={formatTime}
        dayId={dayId}
        tripId={tripId}
        imageUrl={imageUrl}
        defaultImageUrl={defaultImageUrl}
        reservations={reservations}
      />
    </CollapsibleContent>
  );
};

export default DayCollapsibleContent;