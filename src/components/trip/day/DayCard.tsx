import React, { useState, useEffect } from "react";
import { format, parseISO, startOfDay, addDays } from "date-fns";
import DayHeader from "./DayHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent } from "@radix-ui/react-collapsible";
import {
  DayActivity,
  HotelStay,
  ActivityFormData,
  Transportation,
} from "@/types/trip";
import DayEditDialog from "./DayEditDialog";
import { toast } from "sonner";
import AccommodationDialog from "@/components/trip/accommodation/AccommodationDialog";
import ActivityDialogs from "@/components/trip/day/activities/ActivityDialogs";
import DiningList from "../dining/DiningList";
import TransportationDialog from "@/components/trip/transportation/TransportationDialog";
import { CURRENCIES } from "@/utils/currencyConstants";
import DayActivityManager from "./components/DayActivityManager";
import { useTransportationEvents } from "@/hooks/use-transportation-events";

const initialActivity: ActivityFormData = {
  title: "",
  description: "",
  start_time: "",
  end_time: "",
  cost: "",
  currency: CURRENCIES[0],
};

const formatTime12 = (time?: string) => {
  if (!time) return "";
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minuteStr}${period}`;
};

const formatTime24 = (time?: string) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  if (!hours || !minutes) return "";
  return `${hours}:${minutes}`;
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

const getNormalizedDay = (date: string) => date.split("T")[0];

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
  const [newActivity, setNewActivity] = useState<ActivityFormData>(initialActivity);
  const [activityEdit, setActivityEdit] = useState<ActivityFormData>(initialActivity);

  const [isTransportationDialogOpen, setIsTransportationDialogOpen] =
    useState(false);
  const [selectedTransportation, setSelectedTransportation] =
    useState<Transportation | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (originalImageUrl) {
      setImageUrl(originalImageUrl);
    }
  }, [originalImageUrl]);

  const { data: reservations } = useQuery({
    queryKey: ["reservations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("day_id", id)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { transportations } = useTransportationEvents(tripId);
  // Extract the day of week from the date
  const dayOfWeek = format(parseISO(date), "EEEE");
  const dayTitle = title || dayOfWeek;

  const formatTransportTime = (transport: Transportation) => {
    const startDate = transport.start_date
      ? format(parseISO(transport.start_date), "MMM dd, yyyy")
      : "";
    const startTime = transport.start_time
      ? formatTime12(transport.start_time)
      : "";
    const endDate = transport.end_date
      ? format(parseISO(transport.end_date), "MMM dd, yyyy")
      : "";
    const endTime = transport.end_time
      ? formatTime12(transport.end_time)
      : "";

    let startString = startDate;
    if (startTime) startString += ` ${startTime}`;

    let endString = "";
    if (endDate) {
      endString = endDate;
      if (endTime) endString += ` ${endTime}`;
    }
    return endString ? `${startString} - ${endString}` : startString;
  };

  const refreshTripData = () => {
    queryClient.invalidateQueries(["trip"]);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async (data: any) => {
    try {
      if (data.title) setEditTitle(data.title);
      if (data.image_url) setImageUrl(data.image_url);

      const { error, data: updatedData } = await supabase
        .from("trip_days")
        .update({
          title: data.title,
          image_url: data.image_url,
        })
        .eq("day_id", id)
        .select("*")
        .single();

      if (error) {
        toast.error("Failed to save changes");
        throw error;
      } else {
        toast.success("Day updated successfully");
        if (updatedData.image_url) {
          setImageUrl(updatedData.image_url);
        }
        refreshTripData();
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving day edit:", error);
    }
  };

  const normalizedDay = getNormalizedDay(date);

  const filteredHotelStays = hotelStays.filter((stay: HotelStay) => {
    if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
    const checkinDate = stay.hotel_checkin_date;
    const checkoutDate = stay.hotel_checkout_date;
    const dayDate = new Date(normalizedDay);
    return (
      dayDate >= new Date(checkinDate) && 
      dayDate <= new Date(checkoutDate)
      );
  });


  const safeTransportations = transportations || [];
  const filteredTransportations = safeTransportations.filter(
    (transport: Transportation) => {
      const transportStartDate = transport.start_date;
      const transportEndDate = transport.end_date ? transport.end_date : transportStartDate;
      const dayDate = new Date(normalizedDay);
      return (
        dayDate >= new Date(transportStartDate) &&
        dayDate <= new Date(transportEndDate)
      );
    }
  );

  const handleHotelEdit = (stay: HotelStay) => {
    setHotelDialog({ open: true, initialData: stay });
  };

  const { handleAddActivity, handleEditActivity, handleDeleteActivity } =
    DayActivityManager({ id, tripId, activities });

  const handleActivityEditClick = (activity: DayActivity) => {
    if (activity.id) {
      setEditingActivity(activity.id);
      setActivityEdit({
        title: activity.title,
        description: activity.description || "",
        start_time: activity.start_time ? activity.start_time.slice(0, 5) : "",
        end_time: activity.end_time ? activity.end_time.slice(0, 5) : "",
        cost: activity.cost ? String(activity.cost) : "",
        currency: activity.currency || "",
      });
    }
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-lg mb-6 bg-sand-300">
      <DayEditDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        dayId={id}
        currentTitle={title}
        onTitleChange={setEditTitle}
        onSave={handleSaveEdit}
      />

      <DayHeader
        title={dayTitle}
        date={date}
        isOpen={isExpanded}
        onEdit={handleEdit}
        onToggle={() => setIsExpanded((prev) => !prev)}
        dayId={id}
        imageUrl={imageUrlState}
        defaultImageUrl={defaultImageUrl}
      />

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="p-4 bg-sand-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left column: Hotel & Transportation */}
              <div className="flex flex-col gap-4">
                {/* HOTEL STAY */}
                <div className="bg-gray-100 rounded-lg p-4">
                  <h3 className="text-base font-semibold mb-2">Hotel Stay</h3>
                  <div className="space-y-2">
                    {filteredHotelStays.map((stay) => {
                      console.log(
                        "Normalized checkout:",
                        getNormalizedDay(stay.hotel_checkout_date),
                        "normalized day:",
                        normalizedDay
                      );
                      return (
                        <div
                          key={stay.stay_id}
                          onClick={() => handleHotelEdit(stay)}
                          className="cursor-pointer flex justify-between items-center p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50"
                        >
                          <div>
                            <h4 className="font-medium text-gray-700 text-sm">{stay.hotel}</h4>
                            <p className="text-xs text-gray-500">
                              {stay.hotel_address || stay.hotel_details}
                            </p>
                            {stay.hotel_checkin_date === normalizedDay && (
                              <div className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                Check-in {stay.checkin_time ? formatTime12(stay.checkin_time) : ""}
                              </div>
                            )}
                            {stay.hotel_checkout_date === normalizedDay && (
                              <div className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                                Check-out {stay.checkout_time ? formatTime12(stay.checkout_time) : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredHotelStays.length === 0 && (
                      <p className="text-gray-500 text-xs italic">
                        No hotel stay booked this night
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHotelDialog({ open: true, initialData: null })}
                      className="w-full bg-white/10 text-gray-500 hover:bg-white/20 mt-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Hotel Stay
                    </Button>
                  </div>
                </div>

                {/* TRANSPORTATION */}
                <div className="bg-gray-100 rounded-lg p-4">
                  <h3 className="text-base font-semibold mb-2">Flights and Transportation</h3>
                  <div className="space-y-2">
                    {filteredTransportations.length > 0 ? (
                      filteredTransportations.map((transport) => (
                        <div
                          key={transport.id}
                          onClick={() => {
                            setSelectedTransportation(transport);
                            setIsTransportationDialogOpen(true);
                          }}
                          className="cursor-pointer flex justify-between items-center p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50"
                        >
                          <div>
                            <h4 className="font-medium text-gray-700 text-sm">
                              {transport.type.charAt(0).toUpperCase() + transport.type.slice(1)}
                              {transport.departure_location && transport.arrival_location && ` | ${transport.departure_location} → ${transport.arrival_location}`}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {formatTransportTime(transport)}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTransportation(null);
                      setIsTransportationDialogOpen(true);
                    }}
                    className="w-full bg-white/10 text-gray-500 hover:bg-white/20 mt-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transportation
                  </Button>
                </div>
              </div>

              {/* Right column: Activities & Dining */}
              <div className="flex flex-col gap-4">
                {/* ACTIVITIES */}
                <div className="bg-gray-100 rounded-lg p-4">
                  <h3 className="text-base font-semibold mb-2">Activities</h3>
                  <div className="space-y-2">
                    {activities.map((activity) => (
                      <div
                        key={activity.id || activity.title}
                        onClick={() => handleActivityEditClick(activity)}
                        className="cursor-pointer flex justify-between items-center p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50"
                      >
                        <div>
                          <h4 className="font-medium text-gray-700 text-sm">
                            {activity.title}
                          </h4>
                          {activity.start_time && (
                            <p className="text-xs text-gray-500">
                              {formatTime12(activity.start_time)}
                              {activity.end_time && ` - ${formatTime12(activity.end_time)}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {activities.length === 0 && (
                      <p className="text-gray-500 text-xs italic">
                        No activities for this day
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingActivity(true)}
                      className="w-full bg-white/10 text-gray-500 hover:bg-white/20 mt-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Activity
                    </Button>
                  </div>
                </div>

                {/* DINING */}
                <div className="bg-gray-100 rounded-lg p-4">
                  <h3 className="text-base font-semibold mb-2">Dining</h3>
                  <DiningList
                    reservations={reservations || []}
                    formatTime={formatTime12}
                    dayId={id}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <AccommodationDialog
        tripId={tripId}
        open={hotelDialog.open}
        onOpenChange={(open) => setHotelDialog({ ...hotelDialog, open })}
        initialData={hotelDialog.initialData || undefined}
        onSuccess={refreshTripData}
      />

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
