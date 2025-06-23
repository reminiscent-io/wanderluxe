import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@radix-ui/react-collapsible';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import DayHeader from './DayHeader';
import DayEditDialog from './DayEditDialog';
import AccommodationDialog from '@/components/trip/accommodation/AccommodationDialog';
import ActivityDialogs from '@/components/trip/day/activities/ActivityDialogs';
import TransportationDialog from '@/components/trip/transportation/TransportationDialog';
import DiningList from '../dining/DiningList';

import {
  DayActivity,
  HotelStay,
  ActivityFormData,
  Transportation,
} from '@/types/trip';
import { CURRENCIES } from '@/utils/currencyConstants';
import DayActivityManager from './components/DayActivityManager';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { useReservationsRealtime } from '@/hooks/useReservationsRealtime';

const initialActivity: ActivityFormData = {
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  cost: '',
  currency: CURRENCIES[0],
};

/* helpers */
const formatTime12 = (time?: string) => {
  if (!time) return '';
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minuteStr}${period}`;
};

interface DayCardProps {
  id: string;
  tripId: string;
  date: string;
  title?: string;
  activities?: DayActivity[];
  imageUrl?: string | null;
  index: number;
  onDelete: (id: string) => void;
  defaultImageUrl?: string;
  hotelStays?: HotelStay[];
  originalImageUrl?: string | null;
}

const getNormalizedDay = (date: string) => date.split('T')[0];

const DayCard: React.FC<DayCardProps> = ({
  id,
  tripId,
  date,
  title,
  activities = [],
  imageUrl,
  index,
  defaultImageUrl,
  hotelStays = [],
  originalImageUrl,
}) => {
  /* ---------- state ---------- */
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [imageUrlState, setImageUrl] = useState(
    originalImageUrl || imageUrl || null
  );

  const [hotelDialog, setHotelDialog] = useState<{
    open: boolean;
    initialData?: HotelStay | null;
  }>({ open: false, initialData: null });

  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [newActivity, setNewActivity] =
    useState<ActivityFormData>(initialActivity);
  const [activityEdit, setActivityEdit] =
    useState<ActivityFormData>(initialActivity);

  const [isTransportationDialogOpen, setIsTransportationDialogOpen] =
    useState(false);
  const [selectedTransportation, setSelectedTransportation] =
    useState<Transportation | null>(null);

  const qc = useQueryClient();

  /* ---------- realtime reservations ---------- */
  const { reservations } = useReservationsRealtime(id, tripId);

  /* ---------- other hooks ---------- */
  const { transportations } = useTransportationEvents(tripId);

  /* ---------- derived ---------- */
  const dayOfWeek = format(parseISO(date), 'EEEE');
  const dayTitle = title || dayOfWeek;

  const sortedActivities = [...activities].sort((a, b) => {
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });

  /* ---------- sync originalImageUrl ---------- */
  useEffect(() => {
    if (originalImageUrl) setImageUrl(originalImageUrl);
  }, [originalImageUrl]);

  /* ---------- refresh trip helper ---------- */
  const refreshTripData = () => qc.invalidateQueries(['trip']);

  /* ---------- Day edit save ---------- */
  const handleSaveEdit = async (data: any) => {
    try {
      if (data.title) setEditTitle(data.title);
      if (data.image_url) setImageUrl(data.image_url);

      if (data.image_position) {
        localStorage.setItem(
          `day_image_position_${id}`,
          data.image_position
        );
      }

      const updateObj: any = {
        title: data.title,
        image_url: data.image_url,
        image_position: data.image_position,
      };

      const { error, data: updatedData } = await supabase
        .from('trip_days')
        .update(updateObj)
        .eq('day_id', id)
        .select('*')
        .single();

      if (error) throw error;

      if (updatedData.title) setEditTitle(updatedData.title);
      if (updatedData.image_url) setImageUrl(updatedData.image_url);

      toast.success('Day updated successfully');
      refreshTripData();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes');
    }
  };

  /* ---------- activity helpers via manager ---------- */
  const {
    handleAddActivity,
    handleEditActivity,
    handleDeleteActivity,
  } = DayActivityManager({ id, tripId, activities });

  const handleActivityEditClick = (activity: DayActivity) => {
    if (activity.id) {
      setEditingActivity(activity.id);
      setActivityEdit({
        title: activity.title,
        description: activity.description || '',
        start_time: activity.start_time ? activity.start_time.slice(0, 5) : '',
        end_time: activity.end_time ? activity.end_time.slice(0, 5) : '',
        cost: activity.cost ? String(activity.cost) : '',
        currency: activity.currency || '',
      });
    }
  };

  /* ---------- render ---------- */
  return (
    <div className="relative w-full max-w-5xl mx-auto rounded-lg overflow-hidden shadow-lg mb-6 bg-sand-300">
      {/* edit-day dialog */}
      <DayEditDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        dayId={id}
        currentTitle={title}
        onTitleChange={setEditTitle}
        onSave={handleSaveEdit}
      />

      {/* header bar */}
      <DayHeader
        title={dayTitle}
        date={date}
        isOpen={isExpanded}
        onEdit={() => setIsEditing(true)}
        onToggle={() => setIsExpanded((p) => !p)}
        dayId={id}
        imageUrl={imageUrlState}
        defaultImageUrl={defaultImageUrl}
      />

      {/* collapsible content */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="p-4 bg-sand-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ---------- LEFT column: hotel & transport ---------- */}
              {/* HOTEL STAY */}
              {/* (existing hotel stay block unchanged — omitted for brevity) */}
              {/* TRANSPORTATION */}
              {/* (existing transportation block unchanged — omitted for brevity) */}

              {/* ---------- RIGHT column: activities & dining ---------- */}
              <div className="flex flex-col gap-4">
                {/* ACTIVITIES */}
                {/* (existing activities block unchanged — omitted for brevity) */}

                {/* DINING */}
                <div className="bg-gray-100 rounded-lg p-3">
                  <DiningList
                    reservations={reservations || []}
                    formatTime={formatTime12}
                    dayId={id}
                    tripId={tripId}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* accommodation dialog */}
      <AccommodationDialog
        tripId={tripId}
        open={hotelDialog.open}
        onOpenChange={(open) => setHotelDialog({ ...hotelDialog, open })}
        initialData={hotelDialog.initialData || undefined}
        onSuccess={refreshTripData}
      />

      {/* activity dialogs */}
      <ActivityDialogs
        isAddingActivity={isAddingActivity}
        setIsAddingActivity={setIsAddingActivity}
        editingActivity={editingActivity}
        setEditingActivity={setEditingActivity}
        newActivity={newActivity}
        setNewActivity={setNewActivity}
        activityEdit={activityEdit}
        setActivityEdit={setActivityEdit}
        onAddActivity={handleAddActivity}
        onEditActivity={handleEditActivity}
        onDeleteActivity={handleDeleteActivity}
        eventId={id}
      />

      {/* transportation dialog */}
      <TransportationDialog
        tripId={tripId}
        open={isTransportationDialogOpen}
        onOpenChange={setIsTransportationDialogOpen}
        initialData={selectedTransportation || undefined}
        onSuccess={() => {
          refreshTripData();
          setSelectedTransportation(null);
        }}
      />
    </div>
  );
};

export default DayCard;
