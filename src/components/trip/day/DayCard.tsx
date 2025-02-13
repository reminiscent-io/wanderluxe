
import React from 'react';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import DayHeader from './DayHeader';
import EditTitleDialog from './EditTitleDialog';
import { useDayCardState } from './DayCardState';
import { useDayCardHandlers } from './DayCardHandlers';
import { DayActivity } from '@/types/trip';
import ErrorBoundary from './components/ErrorBoundary';
import DayCollapsibleContent from './components/DayCollapsibleContent';
import { useHotelStayCheck } from './hooks/useHotelStayCheck';
import DayActivityManager from './components/DayActivityManager';

interface DayCardProps {
  id: string;
  date: string;
  title?: string;
  description?: string;
  activities: DayActivity[];
  onAddActivity: () => void;
  index: number;
  hotelDetails?: {
    name: string;
    details: string;
    imageUrl?: string;
  };
  onDelete: (id: string) => void;
  imageUrl?: string | null;
  defaultImageUrl?: string;
  tripId: string;
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

const DayCard: React.FC<DayCardProps> = ({
  id,
  date,
  title,
  activities,
  index,
  hotelDetails,
  onDelete,
  imageUrl,
  defaultImageUrl,
  tripId,
  reservations
}) => {
  const {
    isEditing,
    setIsEditing,
    editTitle,
    setEditTitle,
    isAddingActivity,
    setIsAddingActivity,
    editingActivity,
    setEditingActivity,
    newActivity,
    setNewActivity,
    activityEdit,
    setActivityEdit,
  } = useDayCardState(title);

  const { handleUpdateTitle, handleDeleteDay } = useDayCardHandlers(id, onDelete);
  const isWithinHotelStay = useHotelStayCheck(tripId, date);

  const formatTime = (time?: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <ErrorBoundary>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="space-y-4"
      >
        <Card className="overflow-hidden">
          <Collapsible defaultOpen={true}>
            <CollapsibleTrigger className="w-full">
              <div className="cursor-pointer">
                <DayHeader
                  date={date}
                  dayNumber={index + 1}
                  onEdit={() => setIsEditing(true)}
                  onDelete={!isWithinHotelStay ? () => handleDeleteDay() : undefined}
                  dayId={id}
                  title={title}
                  activities={activities}
                  formatTime={formatTime}
                  canDelete={!isWithinHotelStay}
                />
              </div>
            </CollapsibleTrigger>
            <DayCollapsibleContent
              title={title || ""}
              activities={activities}
              hotelDetails={hotelDetails}
              index={index}
              onAddActivity={() => setIsAddingActivity(true)}
              onEditActivity={(id) => {
                const activity = activities.find(a => a.id === id);
                if (activity) {
                  setEditingActivity(id);
                }
              }}
              formatTime={formatTime}
              dayId={id}
              tripId={tripId}
              imageUrl={imageUrl}
              defaultImageUrl={defaultImageUrl}
              reservations={reservations}
            />
          </Collapsible>
        </Card>

        <EditTitleDialog
          isOpen={isEditing}
          onOpenChange={setIsEditing}
          title={editTitle}
          onTitleChange={setEditTitle}
          onSave={async () => {
            const success = await handleUpdateTitle(editTitle);
            if (success) setIsEditing(false);
          }}
        />

        <DayActivityManager
          id={id}
          tripId={tripId}
          isAddingActivity={isAddingActivity}
          setIsAddingActivity={setIsAddingActivity}
          editingActivity={editingActivity}
          setEditingActivity={setEditingActivity}
          newActivity={newActivity}
          setNewActivity={setNewActivity}
          activityEdit={activityEdit}
          setActivityEdit={setActivityEdit}
          activitiesLength={activities.length}
        />
      </motion.div>
    </ErrorBoundary>
  );
};

export default DayCard;
