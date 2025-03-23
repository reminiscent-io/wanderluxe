import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import DayHeader from './DayHeader';
import { Button } from '@/components/ui/button';
import { Pencil, Plus } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent } from '@radix-ui/react-collapsible';
import { DayActivity, HotelStay, ActivityFormData } from '@/types/trip';
import DayImage from './DayImage';
import DayEditDialog from './DayEditDialog';
import { toast } from 'sonner';
import AccommodationDialog from '@/components/trip/accommodation/AccommodationDialog';
import ActivityDialogs from '@/components/trip/day/activities/ActivityDialogs';

const initialActivity: ActivityFormData = { 
  title: '', 
  description: '', 
  start_time: '', 
  end_time: '', 
  cost: '', 
  currency: '' 
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
  transportations?: any[];
  originalImageUrl?: string | null;
}

const DayCard: React.FC<DayCardProps> = ({
  id,
  tripId,
  date,
  title,
  activities = [],
  imageUrl,
  index,
  onDelete,
  defaultImageUrl,
  hotelStays = [],
  transportations = [],
  originalImageUrl,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [imageUrlState, setImageUrl] = useState(originalImageUrl || imageUrl || null);
  const [isHotelDialogOpen, setIsHotelDialogOpen] = useState(false);
  const [editHotelStay, setEditHotelStay] = useState<HotelStay | null>(null);
  const [isHotelEditDialogOpen, setIsHotelEditDialogOpen] = useState(false);

  // Activity dialog states
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState<ActivityFormData>(initialActivity);
  const [activityEdit, setActivityEdit] = useState<ActivityFormData>(initialActivity);
  
  // Reservation dialog states
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<string | null>(null);
  const [reservationData, setReservationData] = useState<any>(null);

  const queryClient = useQueryClient();

  // Update imageUrlState when originalImageUrl changes
  useEffect(() => {
    if (originalImageUrl) {
      setImageUrl(originalImageUrl);
      console.log("Updated imageUrlState from originalImageUrl:", originalImageUrl);
    }
  }, [originalImageUrl]);

  const { data: reservations } = useQuery({
    queryKey: ['reservations', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_reservations')
        .select('*')
        .eq('day_id', id)
        .order('order_index');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const dayTitle = title || format(parseISO(date), 'EEEE');

  const handleEdit = () => {
    console.log("Edit DayCard", id);
    setIsEditing(true);
  };

  const handleSaveEdit = async (data: any) => {
    try {
      if (data.title) {
        setEditTitle(data.title);
      }
      if (data.image_url) {
        setImageUrl(data.image_url);
      }
      console.log("Saving to database:", { id, title: data.title, image_url: data.image_url });
      const { error, data: updatedData } = await supabase
        .from('trip_days')
        .update({
          title: data.title,
          image_url: data.image_url
        })
        .eq('day_id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error saving day edit:', error);
        toast.error('Failed to save changes');
        throw error;
      } else {
        toast.success('Day updated successfully');
        console.log("Database updated successfully:", updatedData);
        if (updatedData.image_url) {
          setImageUrl(updatedData.image_url);
        }
        queryClient.invalidateQueries(['trip']);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving day edit:', error);
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    if (!hours || !minutes) return '';
    return `${hours}:${minutes}`;
  };

  // Normalize the day date to avoid timezone issues
  const normalizedDay = date.split('T')[0];

  // Filter hotel stays for the current day only once
  const filteredHotelStays = hotelStays.filter(stay => {
    if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
    const checkinDate = stay.hotel_checkin_date.split('T')[0];
    const checkoutDate = stay.hotel_checkout_date.split('T')[0];
    const dayDate = new Date(normalizedDay);
    return dayDate >= new Date(checkinDate) && dayDate < new Date(checkoutDate);
  });

  // Open the edit dialog when an accommodation card is clicked
  const handleHotelEdit = (stay: HotelStay) => {
    setEditHotelStay(stay);
    setIsHotelEditDialogOpen(true);
  };

  // Open the edit dialog when an activity item is clicked
  const handleActivityEdit = (activity: DayActivity) => {
    if (activity.id) {
      setEditingActivity(activity.id);
      setActivityEdit({
        title: activity.title,
        description: activity.description || '',
        start_time: activity.start_time || '',
        end_time: activity.end_time || '',
        cost: activity.cost ? String(activity.cost) : '',
        currency: activity.currency || '',
      });
    }
  };
  
  // Open the edit dialog when a reservation item is clicked
  const handleReservationEdit = (reservation: any) => {
    if (reservation.id) {
      setEditingReservation(reservation.id);
      setReservationData(reservation);
      setIsReservationDialogOpen(true);
      console.log("Editing reservation:", reservation);
    }
  };

  // Implement activity add/edit functionality
  const handleAddActivity = async (activity: ActivityFormData) => {
    console.log("Adding activity:", activity);
    try {
      if (!activity.title.trim()) {
        toast.error('Activity title is required');
        return Promise.reject(new Error('Activity title is required'));
      }

      // Convert cost to number if provided, otherwise null
      const costAsNumber = activity.cost && activity.cost.trim() !== '' 
        ? parseFloat(activity.cost) 
        : null;

      const newActivity = {
        day_id: id,
        trip_id: tripId,
        title: activity.title.trim(),
        description: activity.description?.trim() || null,
        start_time: activity.start_time || null,
        end_time: activity.end_time || null,
        cost: costAsNumber,
        currency: activity.currency || 'USD',
        order_index: activities.length, // Add to the end
      };

      const { data, error } = await supabase
        .from('day_activities')
        .insert(newActivity)
        .select('*')
        .single();

      if (error) {
        console.error('Error saving activity:', error);
        toast.error('Failed to save activity');
        throw error;
      }

      toast.success('Activity added successfully');
      queryClient.invalidateQueries(['trip']);
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding activity:', error);
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleEditActivity = async (activityId: string) => {
    console.log("Editing activity with id:", activityId);
    try {
      if (!activityEdit.title.trim()) {
        toast.error('Activity title is required');
        return Promise.reject(new Error('Activity title is required'));
      }

      // Convert cost to number if provided, otherwise null
      const costAsNumber = activityEdit.cost && activityEdit.cost.trim() !== '' 
        ? parseFloat(activityEdit.cost) 
        : null;

      const updatedActivity = {
        title: activityEdit.title.trim(),
        description: activityEdit.description?.trim() || null,
        start_time: activityEdit.start_time || null,
        end_time: activityEdit.end_time || null,
        cost: costAsNumber,
        currency: activityEdit.currency || 'USD',
      };

      const { data, error } = await supabase
        .from('day_activities')
        .update(updatedActivity)
        .eq('id', activityId)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating activity:', error);
        toast.error('Failed to update activity');
        throw error;
      }

      toast.success('Activity updated successfully');
      queryClient.invalidateQueries(['trip']);
      setEditingActivity(null);
      return Promise.resolve();
    } catch (error) {
      console.error('Error editing activity:', error);
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-lg mb-6">
      <DayEditDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        dayId={id}
        currentTitle={title}
        onTitleChange={setEditTitle}
        onSave={handleSaveEdit}
      />

      <div className="z-30">
        <DayHeader
          title={dayTitle}
          date={date}
          isOpen={isExpanded}
          onEdit={handleEdit}
          onDelete={() => onDelete(id)}
          onToggle={() => setIsExpanded(prev => !prev)}
        />
      </div>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="max-h-[600px] overflow-y-auto">
          <div className="relative w-full h-[600px]">
            <DayImage
              dayId={id}
              title={title}
              imageUrl={imageUrlState}
              defaultImageUrl={defaultImageUrl}
              className="absolute top-0 left-0 w-full h-full object-cover z-0"
            />

            <div className="relative z-10 w-full h-full p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4 order-1">
                <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Hotel Stay</h3>
                  <div className="space-y-2">
                    {filteredHotelStays.map((stay) => (
                      <div 
                        key={stay.stay_id || stay.id} 
                        onClick={() => handleHotelEdit(stay)}
                        className="cursor-pointer flex justify-between items-center p-3
                                   bg-white/90 rounded-lg shadow-sm 
                                   hover:bg-white/100"
                      >
                        <div>
                          <h4 className="font-medium text-gray-700">{stay.hotel}</h4>
                          <p className="text-sm text-gray-500">{stay.hotel_address}</p>
                          {stay.hotel_checkin_date && stay.hotel_checkin_date.split('T')[0] === normalizedDay && (
                            <div className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Check-in day
                            </div>
                          )}
                          {stay.hotel_checkout_date && stay.hotel_checkout_date.split('T')[0] === normalizedDay && (
                            <div className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              Check-out day
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredHotelStays.length === 0 && (
                      <p className="text-white text-sm italic">No hotel stay booked this night</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsHotelDialogOpen(true)}
                      className="w-full bg-white/10 text-white hover:bg-white/20 mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Hotel Stay
                    </Button>
                  </div>
                </div>
                <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Flights and Transportation</h3>
                  {transportations.map((transport, idx) => (
                    <div key={idx} className="text-white">
                      <p className="font-medium">{transport.route}</p>
                      <p className="text-sm">{transport.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 order-2">
                <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Activities</h3>
                  <div className="space-y-2">
                    {activities.map((activity) => (
                      <div
                        key={activity.id || activity.title}
                        onClick={() => handleActivityEdit(activity)}
                        className="cursor-pointer flex justify-between items-center p-3
                                   bg-white/90 rounded-lg shadow-sm 
                                   hover:bg-white/100"
                      >
                        <div>
                          <h4 className="font-medium text-gray-700">{activity.title}</h4>
                          {activity.start_time && (
                            <p className="text-sm text-gray-500">
                              {formatTime(activity.start_time)}
                              {activity.end_time && ` - ${formatTime(activity.end_time)}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!activities || activities.length === 0) && (
                      <p className="text-white text-sm italic">No activities for this day</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingActivity(true)}
                      className="w-full bg-white/10 text-white hover:bg-white/20 mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Activity
                    </Button>
                  </div>
                </div>

                <div className="bg-black/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Reservations</h3>
                  <div className="space-y-2">
                    {reservations?.map((reservation, idx) => (
                      <div
                        key={reservation.id || idx}
                        className="flex justify-between items-center p-3
                                   bg-white/90 rounded-lg shadow-sm 
                                   hover:bg-white/100 cursor-pointer"
                        onClick={() => handleReservationEdit(reservation)}
                      >
                        <div>
                          <h4 className="font-medium text-gray-700">{reservation.restaurant_name}</h4>
                          {reservation.reservation_time && (
                            <p className="text-sm text-gray-500">{formatTime(reservation.reservation_time)}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReservationEdit(reservation);
                          }}
                          className="text-gray-600 hover:bg-gray-200 h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!reservations || reservations.length === 0) && (
                      <p className="text-white text-sm italic">No reservations for this day</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReservationData(null);
                        setEditingReservation(null);
                        setIsReservationDialogOpen(true);
                      }}
                      className="w-full bg-white/10 text-white hover:bg-white/20 mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Reservation
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Dialog for adding a new hotel stay */}
      <AccommodationDialog
        tripId={tripId}
        open={isHotelDialogOpen}
        onOpenChange={setIsHotelDialogOpen}
        onSuccess={() => queryClient.invalidateQueries(['trip'])}
      />

      {/* Dialog for editing an existing hotel stay */}
      <AccommodationDialog
        tripId={tripId}
        open={isHotelEditDialogOpen}
        onOpenChange={setIsHotelEditDialogOpen}
        initialData={editHotelStay || undefined}
        onSuccess={() => queryClient.invalidateQueries(['trip'])}
      />

      {/* Activity dialogs for adding and editing */}
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
        eventId={id}
      />

      {/* Reservation dialog */}
      {isReservationDialogOpen && (
        <Dialog 
          open={isReservationDialogOpen} 
          onOpenChange={(open) => { 
            if (!open) setIsReservationDialogOpen(false);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingReservation ? 'Edit Reservation' : 'Add Reservation'}
              </DialogTitle>
            </DialogHeader>
            {/* You'll need to create a ReservationForm component similar to ActivityForm */}
            <div className="p-4">
              <p>Reservation form would go here.</p>
              <p className="text-sm text-gray-500 mb-4">This functionality is in development. Currently, you can see reservation details in the console.</p>
              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsReservationDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Handle save reservation logic here
                    console.log("Save reservation:", reservationData);
                    setIsReservationDialogOpen(false);
                  }}
                >
                  Save Reservation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DayCard;
