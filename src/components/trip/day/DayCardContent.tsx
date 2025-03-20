import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import ActivityDialogs from './ActivityDialogs';
import { DayActivity, ActivityFormData, HotelStay } from '@/types/trip';
import ActivitiesList from './activities/ActivitiesList';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BedDouble, Calendar, MapPin } from 'lucide-react';
import { accommodationService } from '@/services/accommodation/accommodationService';

interface DayCardContentProps {
  index: number;
  title: string;
  activities: DayActivity[];
  onAddActivity: (activity: ActivityFormData) => Promise<void>;
  onEditActivity: (activity: DayActivity) => void;
  formatTime: (time?: string) => string;
  dayId: string;
  eventId: string;
  date: string;
  accommodation?: any; // Updated to accept any accommodation type
}

const DayCardContent: React.FC<DayCardContentProps> = ({
  index,
  title,
  activities,
  onAddActivity,
  onEditActivity,
  formatTime,
  dayId,
  eventId,
  date,
  accommodation,
}) => {
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<DayActivity | null>(null);
  const [newActivity, setNewActivity] = useState<ActivityFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD'
  });

  // Sort activities by start_time if present; else by created_at
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      const aTime = a.start_time && a.start_time.trim() !== '' ? a.start_time : null;
      const bTime = b.start_time && b.start_time.trim() !== '' ? b.start_time : null;
      if (aTime && bTime) {
        return aTime.localeCompare(bTime);
      } else if (aTime && !bTime) {
        return -1;
      } else if (!aTime && bTime) {
        return 1;
      } else {
        // Both times missing: sort by creation time
        return a.created_at.localeCompare(b.created_at);
      }
    });
  }, [activities]);

  const handleEditActivityWrapper = (activity: DayActivity) => {
    if (!activity.id) {
      console.error("Activity id is missing in DayCardContent", activity);
      toast.error("This activity hasn't been saved yet. Please save it before editing.");
      return;
    }
    console.log("DayCardContent: Editing activity with id", activity.id);
    onEditActivity(activity);
  };

  // Determine if this is check-in or check-out day for the accommodation
  const isCheckInDay = accommodation && accommodation.hotel_checkin_date === date;
  const isCheckOutDay = accommodation && accommodation.hotel_checkout_date === date;
  const hasAccommodation = accommodation && (isCheckInDay || isCheckOutDay || 
    (date > accommodation.hotel_checkin_date && date < accommodation.hotel_checkout_date));
  
  console.log('DayCardContent date:', date, 'accommodation:', accommodation, 'hasAccommodation:', hasAccommodation);

  return (
    <div className="p-6 space-y-6">
      {/* Accommodation Stay Section */}
      {hasAccommodation && (
        <Card className="bg-sand-50 border-sand-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <BedDouble className="h-5 w-5 mr-2 text-sand-700" />
              Stay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="font-semibold text-base">{accommodation.hotel}</h3>
              {accommodation.hotel_address && (
                <p className="text-sm text-gray-600 flex items-start">
                  <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0 text-sand-600" />
                  {accommodation.hotel_address}
                </p>
              )}
              {isCheckInDay && (
                <p className="text-sm text-emerald-600 flex items-center">
                  <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                  Check-in day
                </p>
              )}
              {isCheckOutDay && (
                <p className="text-sm text-amber-600 flex items-center">
                  <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                  Check-out day
                </p>
              )}
              {!isCheckInDay && !isCheckOutDay && (
                <p className="text-sm text-gray-600">
                  Continuing stay
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities */}
      <ActivitiesList
        activities={sortedActivities}
        formatTime={formatTime}
        onAddActivity={() => setIsAddingActivity(true)}
        onEditActivity={(activity) => {
          setEditingActivity(activity);
          handleEditActivityWrapper(activity);
        }}
      />

      {/* Add / Edit Activity Dialog */}
      <ActivityDialogs
        isAddingActivity={isAddingActivity}
        setIsAddingActivity={setIsAddingActivity}
        newActivity={newActivity}
        setNewActivity={setNewActivity}
        onAddActivity={onAddActivity}
        eventId={eventId}
        editingActivity={editingActivity}
        setEditingActivity={setEditingActivity}
        onEditActivity={onEditActivity}
      />
    </div>
  );
};

export default DayCardContent;
