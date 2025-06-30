import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { formatTransportationType } from '@/utils/transportationUtils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Collapsible, CollapsibleContent } from '@radix-ui/react-collapsible';
import { toast } from 'sonner';
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
import DayActivityManager from './components/DayActivityManager';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { useReservationsRealtime } from '@/hooks/useReservationsRealtime';
import { CURRENCIES } from '@/utils/currencyConstants';

/* ---------- helpers ---------- */
const initialActivity: ActivityFormData = {
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  cost: '',
  currency: CURRENCIES[0],
};

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
  tripArrivalDate?: string;
  tripDepartureDate?: string;
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
  tripArrivalDate,
  tripDepartureDate,
}) => {
  /* ---------- UI state ---------- */
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

  /* ---------- data ---------- */
  const qc = useQueryClient();
  const { reservations } = useReservationsRealtime(id, tripId);
  const { transportations } = useTransportationEvents(tripId);

  /* ---------- derived ---------- */
  const dayOfWeek = format(parseISO(date), 'EEEE');
  const dayTitle = title || dayOfWeek;

  const sortedActivities = [...activities].sort((a, b) => {
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });

  const normalizedDay = getNormalizedDay(date);

  const filteredHotelStays = hotelStays.filter((stay) => {
    if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
    const dayDate = new Date(normalizedDay);
    return (
      dayDate >= new Date(stay.hotel_checkin_date) &&
      dayDate <= new Date(stay.hotel_checkout_date)
    );
  });

  const safeTransportations = transportations || [];
  const filteredTransportations = safeTransportations
    .filter((t) => {
      const start = t.start_date;
      const end = t.end_date ? t.end_date : start;
      const dayDate = new Date(normalizedDay);
      return dayDate >= new Date(start) && dayDate <= new Date(end);
    })
    .sort((a, b) => {
      if (a.start_time && b.start_time)
        return a.start_time.localeCompare(b.start_time);
      if (a.start_time) return -1;
      if (b.start_time) return 1;
      return 0;
    });

  /* ---------- effects ---------- */
  useEffect(() => {
    if (originalImageUrl) setImageUrl(originalImageUrl);
  }, [originalImageUrl]);

  /* ---------- helpers ---------- */
  const refreshTripData = () => qc.invalidateQueries(['trip']);

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

      const { error, data: updated } = await supabase
        .from('trip_days')
        .update(updateObj)
        .eq('day_id', id)
        .select('*')
        .single();

      if (error) throw error;

      if (updated.title) setEditTitle(updated.title);
      if (updated.image_url) setImageUrl(updated.image_url);

      toast.success('Day updated successfully');
      refreshTripData();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes');
    }
  };

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

  /* ---------- rendering ---------- */
  return (
    <div className="relative w-full max-w-5xl mx-auto rounded-lg overflow-hidden shadow-lg mb-6 bg-sand-300">
      {/* ---------- Day edit dialog ---------- */}
      <DayEditDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        dayId={id}
        currentTitle={title}
        onTitleChange={setEditTitle}
        onSave={handleSaveEdit}
      />

      {/* ---------- Header ---------- */}
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

      {/* ---------- Collapsible content ---------- */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="p-4 bg-sand-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ========== LEFT COLUMN ========== */}
              <div className="flex flex-col gap-4">
                {/* HOTEL STAY */}
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-base font-semibold">Hotel Stay</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setHotelDialog({ open: true, initialData: null })
                      }
                      className="bg-white/10 text-gray-500 hover:bg-sand-600 h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {filteredHotelStays.map((stay) => (
                      <div
                        key={stay.stay_id}
                        onClick={() => setHotelDialog({ open: true, initialData: stay })}
                        className="cursor-pointer flex justify-between items-center p-1.5 bg-white rounded-lg shadow-sm hover:bg-gray-50"
                      >
                        <div>
                          <h4 className="font-medium text-gray-700 text-sm">
                            {stay.hotel}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {stay.hotel_address || stay.hotel_details}
                          </p>
                          {stay.hotel_checkin_date === normalizedDay && (
                            <div className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                              Check-in{' '}
                              {stay.checkin_time
                                ? formatTime12(stay.checkin_time)
                                : ''}
                            </div>
                          )}
                          {stay.hotel_checkout_date === normalizedDay && (
                            <div className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                              Check-out{' '}
                              {stay.checkout_time
                                ? formatTime12(stay.checkout_time)
                                : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {filteredHotelStays.length === 0 && (
                      <p className="text-gray-500 text-xs italic">
                        No hotel stay booked this night
                      </p>
                    )}
                  </div>
                </div>

                {/* TRANSPORTATION */}
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-base font-semibold">
                      Flights and Transportation
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTransportation(null);
                        setIsTransportationDialogOpen(true);
                      }}
                      className="bg-white/10 text-gray-500 hover:bg-sand-600 h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {filteredTransportations.length > 0 ? (
                      filteredTransportations.map((transport) => (
                        <div
                          key={transport.id}
                          onClick={() => {
                            setSelectedTransportation(transport);
                            setIsTransportationDialogOpen(true);
                          }}
                          className="cursor-pointer flex justify-between items-center p-1.5 bg-white rounded-lg shadow-sm hover:bg-gray-50"
                        >
                          <div>
                            <h4 className="font-medium text-gray-700 text-sm">
                              {formatTransportationType(transport.type)}
                              {transport.departure_location &&
                                transport.arrival_location &&
                                ` | ${transport.departure_location} → ${transport.arrival_location}`}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {(() => {
                                const sd = transport.start_date
                                  ? format(parseISO(transport.start_date), 'MMM dd, yyyy')
                                  : '';
                                const st = transport.start_time
                                  ? formatTime12(transport.start_time)
                                  : '';
                                const ed = transport.end_date
                                  ? format(parseISO(transport.end_date), 'MMM dd, yyyy')
                                  : '';
                                const et = transport.end_time
                                  ? formatTime12(transport.end_time)
                                  : '';
                                const start = st ? `${sd} ${st}` : sd;
                                const end = ed ? `${ed} ${et}` : '';
                                return end ? `${start} - ${end}` : start;
                              })()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-xs italic">
                        No transportation for this day
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ========== RIGHT COLUMN ========== */}
              <div className="flex flex-col gap-4">
                {/* ACTIVITIES */}
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-base font-semibold">Activities</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingActivity(true)}
                      className="bg-white/10 text-gray-500 hover:bg-sand-600 h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {sortedActivities.map((activity) => (
                      <div
                        key={activity.id}
                        onClick={() => handleActivityEditClick(activity)}
                        className="cursor-pointer flex justify-between items-center p-1.5 bg-white rounded-lg shadow-sm hover:bg-gray-50"
                      >
                        <div>
                          <h4 className="font-medium text-gray-700 text-sm">
                            {activity.title}
                          </h4>
                          {activity.start_time && (
                            <p className="text-xs text-gray-500">
                              {formatTime12(activity.start_time)}
                              {activity.end_time &&
                                ` - ${formatTime12(activity.end_time)}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {sortedActivities.length === 0 && (
                      <p className="text-gray-500 text-xs italic">
                        No activities for this day
                      </p>
                    )}
                  </div>
                </div>

                {/* DINING */}
                <div className="bg-gray-100 rounded-lg p-3">
                  <DiningList
                    reservations={reservations || []}
                    formatTime={formatTime12}
                    dayId={id}
                    tripId={tripId}
                    className="text-xs"
                    tripArrivalDate={tripArrivalDate}
                    tripDepartureDate={tripDepartureDate}
                  />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ACCOMMODATION dialog */}
      <AccommodationDialog
        tripId={tripId}
        open={hotelDialog.open}
        onOpenChange={(open) => setHotelDialog({ ...hotelDialog, open })}
        initialData={hotelDialog.initialData || undefined}
        onSuccess={refreshTripData}
      />

      {/* ACTIVITY dialogs */}
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

      {/* TRANSPORTATION dialog */}
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
