import React from 'react';
import { CollapsibleContent } from "@/components/ui/collapsible";
import DayLayout from '../DayLayout';
import { DayActivity, ActivityFormData } from '@/types/trip';
import Button from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DayCollapsibleContentProps {
  title: string;
  activities: DayActivity[];
  index: number;
  onAddActivity: (activity: ActivityFormData) => Promise<void>;
  onEditActivity: (id: string) => Promise<void>;
  formatTime: (time?: string) => string;
  dayId: string;
  tripId: string;
  imageUrl?: string | null;
  defaultImageUrl?: string;
  reservations?: any[];
  onActivityClick?: (activity: DayActivity) => void;
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
  reservations,
  onActivityClick
}) => {
  const handleDeleteActivity = async (id: string) => {
    //Implementation for deleting activity
  };

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
        onActivityClick={onActivityClick}
      />
    </CollapsibleContent>
  );
};

export default DayCollapsibleContent;