import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  Menu, 
  Calendar, 
  MessageCircle, 
  Lightbulb, 
  BarChart2, 
  Package, 
  Settings, 
  User,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Building,
  Car,
  Plus,
  Edit,
  Trash2,
  MapPin,
  UtensilsCrossed
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogoFromSupabase } from "@/components/LogoFromSupabase";
import { useTripQuery } from "@/hooks/useTripQuery";
import { useTimelineEvents } from "@/hooks/use-timeline-events";
import { useTransportationEvents } from "@/hooks/use-transportation-events";
import { AccommodationDialog } from "@/components/trip/accommodation/AccommodationDialog";
import { TransportationDialog } from "@/components/trip/transportation/TransportationDialog";
import { TripDateEditDialog } from "@/components/trip/TripDateEditDialog";
import { ActivityDialogs } from "@/components/trip/day/activities/ActivityDialogs";
import { RestaurantReservationDialog } from "@/components/trip/dining/RestaurantReservationDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useReservationsRealtime } from "@/hooks/useReservationsRealtime";
import { format, parseISO } from "date-fns";
import type { ActivityFormData, Currency } from "@/types/trip";

export const tripNavItems = [
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'ai-assistant', label: 'AI Assistant', icon: MessageCircle },
  { id: 'vision-board', label: 'Vision Board', icon: Lightbulb },
  { id: 'budget', label: 'Budget', icon: BarChart2 },
  { id: 'booking', label: 'Booking', icon: Package },
];

interface SidebarProps {
  tripId: string | undefined;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar = ({ tripId, activeTab, onTabChange }: SidebarProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['timeline']);
  const [secondaryPanel, setSecondaryPanel] = useState<string | null>(null);
  
  // Dialog states
  const [accommodationOpen, setAccommodationOpen] = useState(false);
  const [transportationOpen, setTransportationOpen] = useState(false);
  const [tripDatesOpen, setTripDatesOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  
  // Selected items for editing
  const [selectedAccommodation, setSelectedAccommodation] = useState<any>(null);
  const [selectedTransportation, setSelectedTransportation] = useState<any>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  // Activity form state for ActivityDialogs
  const [newActivity, setNewActivity] = useState<ActivityFormData>({
    title: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD' as Currency
  });
  
  const [activityEdit, setActivityEdit] = useState<ActivityFormData>({
    title: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD' as Currency
  });

  // Load sidebar state from localStorage
  useEffect(() => {
    const sidebarOpen = localStorage.getItem('sidebar-open');
    if (sidebarOpen !== null) {
      setIsOpen(JSON.parse(sidebarOpen));
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-open', JSON.stringify(isOpen));
  }, [isOpen]);

  const { data: trip } = useTripQuery(tripId);
  const { data: activities = [] } = useTimelineEvents(tripId || '');
  const { data: transportation = [] } = useTransportationEvents(tripId || '');

  // Fetch accommodations from trip data
  const accommodations = trip?.accommodations || [];

  // Fetch reservations with real-time updates for this trip
  const allReservations = tripId ? useReservationsRealtime('', tripId).data || [] : [];

  const toggleExpanded = (item: string) => {
    setExpandedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const handleBackToTrips = () => {
    navigate('/my-trips');
  };

  const handleSubitemClick = (subitem: string) => {
    setSecondaryPanel(subitem);
  };

  // Accommodation handlers
  const handleAccommodationAdd = () => {
    setSelectedAccommodation(null);
    setAccommodationOpen(true);
  };

  const handleAccommodationEdit = (accommodation: any) => {
    setSelectedAccommodation(accommodation);
    setAccommodationOpen(true);
  };

  const handleAccommodationDelete = async (accommodationId: string) => {
    try {
      const { error } = await supabase
        .from('accommodations')
        .delete()
        .eq('stay_id', accommodationId);

      if (error) throw error;
      
      toast.success('Accommodation deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    } catch (error) {
      console.error('Error deleting accommodation:', error);
      toast.error('Failed to delete accommodation');
    }
  };

  // Transportation handlers
  const handleTransportationAdd = () => {
    setSelectedTransportation(null);
    setTransportationOpen(true);
  };

  const handleTransportationEdit = (transport: any) => {
    setSelectedTransportation(transport);
    setTransportationOpen(true);
  };

  const handleTransportationDelete = async (transportId: string) => {
    try {
      const { error } = await supabase
        .from('transportation')
        .delete()
        .eq('id', transportId);

      if (error) throw error;
      
      toast.success('Transportation deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
    } catch (error) {
      console.error('Error deleting transportation:', error);
      toast.error('Failed to delete transportation');
    }
  };

  // Activity handlers
  const handleActivityAdd = () => {
    if (!tripId || !trip) return;
    
    // Set date to first trip date if available
    const firstDate = trip.arrival_date || '';
    setNewActivity({
      title: '',
      description: '',
      date: firstDate,
      start_time: '',
      end_time: '',
      cost: '',
      currency: 'USD' as Currency
    });
    setActivityOpen(true);
  };

  const handleActivityEdit = async (activity: any) => {
    if (!tripId) return;

    try {
      // Fetch the current date for this activity from trip_days table
      const { data: dayData, error: dayError } = await supabase
        .from('trip_days')
        .select('date')
        .eq('day_id', activity.day_id)
        .single();

      if (dayError) {
        console.error('Error fetching day data:', dayError);
        toast.error('Failed to load activity date');
        return;
      }

      const activityDate = dayData?.date || '';
      
      setActivityEdit({
        title: activity.title || '',
        description: activity.description || '',
        date: activityDate,
        start_time: activity.start_time || '',
        end_time: activity.end_time || '',
        cost: activity.cost?.toString() || '',
        currency: activity.currency || 'USD' as Currency
      });
      
      setSelectedActivity(activity);
      setActivityOpen(true);
    } catch (error) {
      console.error('Error preparing activity edit:', error);
      toast.error('Failed to load activity data');
    }
  };

  const handleActivityDelete = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .delete()
        .eq('activity_id', activityId);

      if (error) throw error;
      
      toast.success('Activity deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
    }
  };

  // Handle activity form submission for adding
  const handleAddActivity = async (activity: ActivityFormData) => {
    if (!tripId || !trip) return;

    try {
      // Find the day_id for the selected date
      const { data: dayData, error: dayError } = await supabase
        .from('trip_days')
        .select('day_id')
        .eq('trip_id', tripId)
        .eq('date', activity.date)
        .single();

      if (dayError) {
        console.error('Error finding day for date:', dayError);
        toast.error('Failed to find trip day for selected date');
        return;
      }

      const { error } = await supabase
        .from('day_activities')
        .insert({
          day_id: dayData.day_id,
          title: activity.title,
          description: activity.description,
          start_time: activity.start_time,
          end_time: activity.end_time,
          cost: parseFloat(activity.cost) || 0,
          currency: activity.currency
        });

      if (error) throw error;
      
      toast.success('Activity added successfully');
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
      setActivityOpen(false);
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
    }
  };

  // Handle activity form submission for editing
  const handleEditActivity = async (id: string, updatedActivity: ActivityFormData) => {
    if (!tripId || !trip) return;

    try {
      // If date changed, find the new day_id
      let dayId = selectedActivity?.day_id;
      
      if (updatedActivity.date !== activityEdit.date) {
        const { data: dayData, error: dayError } = await supabase
          .from('trip_days')
          .select('day_id')
          .eq('trip_id', tripId)
          .eq('date', updatedActivity.date)
          .single();

        if (dayError) {
          console.error('Error finding day for new date:', dayError);
          toast.error('Failed to find trip day for selected date');
          return;
        }
        
        dayId = dayData.day_id;
      }

      const { error } = await supabase
        .from('day_activities')
        .update({
          day_id: dayId,
          title: updatedActivity.title,
          description: updatedActivity.description,
          start_time: updatedActivity.start_time,
          end_time: updatedActivity.end_time,
          cost: parseFloat(updatedActivity.cost) || 0,
          currency: updatedActivity.currency
        })
        .eq('activity_id', id);

      if (error) throw error;
      
      toast.success('Activity updated successfully');
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
      setSelectedActivity(null);
    } catch (error) {
      console.error('Error editing activity:', error);
      toast.error('Failed to update activity');
    }
  };

  // Reservation handlers
  const handleReservationAdd = () => {
    setSelectedReservation(null);
    setReservationOpen(true);
  };

  const handleReservationEdit = (reservation: any) => {
    setSelectedReservation(reservation);
    setReservationOpen(true);
  };

  const handleReservationDelete = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservationId);

      if (error) throw error;
      
      toast.success('Reservation deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['reservations', tripId] });
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast.error('Failed to delete reservation');
    }
  };

  const handleEditDates = () => {
    setTripDatesOpen(true);
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'pm' : 'am';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes}${ampm}`;
    } catch {
      return time;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const renderSecondaryPanel = () => {
    if (!secondaryPanel) return null;

    switch (secondaryPanel) {
      case 'accommodations':
        return (
          <div className="fixed left-[280px] top-16 h-[calc(100vh-4rem)] w-[320px] bg-white border-r border-sand-200 z-40 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-earth-600">Accommodations</h3>
                <Button size="sm" variant="ghost" onClick={() => setSecondaryPanel(null)}>
                  <ChevronLeft size={16} />
                </Button>
              </div>
              <div className="mb-4">
                <Button size="sm" onClick={handleAccommodationAdd} className="bg-earth-500 hover:bg-earth-600 text-white w-full">
                  <Plus size={14} className="mr-1" />
                  Add Accommodation
                </Button>
              </div>
              <div className="space-y-3">
                {accommodations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No accommodations yet</p>
                ) : (
                  // Group accommodations by check-in date
                  Object.entries(
                    accommodations.reduce((groups: any, accommodation: any) => {
                      const date = accommodation.hotel_checkin_date;
                      if (!groups[date]) groups[date] = [];
                      groups[date].push(accommodation);
                      return groups;
                    }, {})
                  )
                  .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                  .map(([date, accomms]: [string, any]) => (
                    <div key={date} className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {format(parseISO(date), 'EEE, MMM dd')}
                      </div>
                      {(accomms as any[]).map((accommodation) => (
                        <div key={accommodation.stay_id} className="bg-sand-50 rounded-lg p-3 border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-earth-800 truncate">
                                {accommodation.hotel}
                              </h4>
                              <div className="text-xs text-gray-600 mt-1 space-y-1">
                                <div>Check-in: {format(parseISO(accommodation.hotel_checkin_date), 'MM/dd')} {formatTime(accommodation.checkin_time)}</div>
                                <div>Check-out: {format(parseISO(accommodation.hotel_checkout_date), 'MM/dd')} {formatTime(accommodation.checkout_time)}</div>
                                <div className="font-medium text-earth-600">
                                  {formatCurrency(accommodation.cost, accommodation.currency)}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleAccommodationEdit(accommodation)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit size={12} />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleAccommodationDelete(accommodation.stay_id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      case 'transportation':
        return (
          <div className="fixed left-[280px] top-16 h-[calc(100vh-4rem)] w-[320px] bg-white border-r border-sand-200 z-40 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-earth-600">Transportation</h3>
                <Button size="sm" variant="ghost" onClick={() => setSecondaryPanel(null)}>
                  <ChevronLeft size={16} />
                </Button>
              </div>
              <div className="mb-4">
                <Button size="sm" onClick={handleTransportationAdd} className="bg-earth-500 hover:bg-earth-600 text-white w-full">
                  <Plus size={14} className="mr-1" />
                  Add Transportation
                </Button>
              </div>
              <div className="space-y-3">
                {transportation.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No transportation yet</p>
                ) : (
                  // Group transportation by start date
                  Object.entries(
                    transportation.reduce((groups: any, transport: any) => {
                      const date = transport.start_date;
                      if (!groups[date]) groups[date] = [];
                      groups[date].push(transport);
                      return groups;
                    }, {})
                  )
                  .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                  .map(([date, transports]: [string, any]) => (
                    <div key={date} className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {format(parseISO(date), 'EEE, MMM dd')}
                      </div>
                      {(transports as any[])
                        .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                        .map((transport) => (
                        <div key={transport.id} className="bg-sand-50 rounded-lg p-3 border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-earth-800 truncate">
                                {transport.departure_location} - {transport.arrival_location}
                              </h4>
                              <div className="text-xs text-gray-600 mt-1 space-y-1">
                                <div className="capitalize">{transport.type}</div>
                                <div>
                                  {formatTime(transport.start_time)} - {formatTime(transport.end_time)}
                                  {transport.end_date !== transport.start_date && (
                                    <span className="ml-1">({format(parseISO(transport.end_date), 'M/dd')})</span>
                                  )}
                                </div>
                                <div className="font-medium text-earth-600">
                                  {formatCurrency(transport.cost, transport.currency)}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleTransportationEdit(transport)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit size={12} />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleTransportationDelete(transport.id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      case 'trip-dates':
        return (
          <div className="fixed left-[280px] top-16 h-[calc(100vh-4rem)] w-[320px] bg-white border-r border-sand-200 z-40 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-earth-600">Trip Dates</h3>
                <Button size="sm" variant="ghost" onClick={() => setSecondaryPanel(null)}>
                  <ChevronLeft size={16} />
                </Button>
              </div>
              <div className="mb-4">
                <Button size="sm" onClick={handleEditDates} className="bg-earth-500 hover:bg-earth-600 text-white w-full">
                  <Edit size={14} className="mr-1" />
                  Edit Dates
                </Button>
              </div>
              {trip && (
                <div className="space-y-3">
                  <div className="bg-sand-50 rounded-lg p-3 border">
                    <div className="text-sm font-medium text-earth-800">Arrival</div>
                    <div className="text-sm text-gray-600">
                      {trip.arrival_date ? format(parseISO(trip.arrival_date), 'EEEE, MMMM dd, yyyy') : 'Not set'}
                    </div>
                  </div>
                  <div className="bg-sand-50 rounded-lg p-3 border">
                    <div className="text-sm font-medium text-earth-800">Departure</div>
                    <div className="text-sm text-gray-600">
                      {trip.departure_date ? format(parseISO(trip.departure_date), 'EEEE, MMMM dd, yyyy') : 'Not set'}
                    </div>
                  </div>
                  <div className="bg-sand-50 rounded-lg p-3 border">
                    <div className="text-sm font-medium text-earth-800">Duration</div>
                    <div className="text-sm text-gray-600">
                      {trip.arrival_date && trip.departure_date ? 
                        `${Math.ceil((new Date(trip.departure_date).getTime() - new Date(trip.arrival_date).getTime()) / (1000 * 60 * 60 * 24))} days` : 
                        'Not calculated'
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'activities':
        return (
          <div className="fixed left-[280px] top-16 h-[calc(100vh-4rem)] w-[320px] bg-white border-r border-sand-200 z-40 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-earth-600">Activities</h3>
                <Button size="sm" variant="ghost" onClick={() => setSecondaryPanel(null)}>
                  <ChevronLeft size={16} />
                </Button>
              </div>
              <div className="mb-4">
                <Button size="sm" onClick={handleActivityAdd} className="bg-earth-500 hover:bg-earth-600 text-white w-full">
                  <Plus size={14} className="mr-1" />
                  Add Activity
                </Button>
              </div>
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No activities yet</p>
                ) : (
                  // Group activities by date
                  Object.entries(
                    activities.reduce((groups: any, activity: any) => {
                      const date = activity.date;
                      if (!groups[date]) groups[date] = [];
                      groups[date].push(activity);
                      return groups;
                    }, {})
                  )
                  .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                  .map(([date, dayActivities]: [string, any]) => (
                    <div key={date} className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {format(parseISO(date), 'EEE, MMM dd')}
                      </div>
                      {(dayActivities as any[])
                        .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                        .map((activity) => (
                        <div key={activity.activity_id} className="bg-sand-50 rounded-lg p-3 border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-earth-800 truncate">
                                {activity.title}
                              </h4>
                              <div className="text-xs text-gray-600 mt-1 space-y-1">
                                <div>{formatTime(activity.start_time)} - {formatTime(activity.end_time)}</div>
                                {activity.cost > 0 && (
                                  <div className="font-medium text-earth-600">
                                    {formatCurrency(activity.cost, activity.currency)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleActivityEdit(activity)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit size={12} />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleActivityDelete(activity.activity_id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      case 'reservations':
        return (
          <div className="fixed left-[280px] top-16 h-[calc(100vh-4rem)] w-[320px] bg-white border-r border-sand-200 z-40 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-earth-600">Reservations</h3>
                <Button size="sm" variant="ghost" onClick={() => setSecondaryPanel(null)}>
                  <ChevronLeft size={16} />
                </Button>
              </div>
              <div className="mb-4">
                <Button size="sm" onClick={handleReservationAdd} className="bg-earth-500 hover:bg-earth-600 text-white w-full">
                  <Plus size={14} className="mr-1" />
                  Add Reservation
                </Button>
              </div>
              <div className="space-y-3">
                {allReservations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No reservations yet</p>
                ) : (
                  // Group reservations by date
                  Object.entries(
                    allReservations.reduce((groups: any, reservation: any) => {
                      const date = reservation.date || 'No Date';
                      if (!groups[date]) groups[date] = [];
                      groups[date].push(reservation);
                      return groups;
                    }, {})
                  )
                  .sort(([a], [b]) => {
                    if (a === 'No Date') return 1;
                    if (b === 'No Date') return -1;
                    return new Date(a).getTime() - new Date(b).getTime();
                  })
                  .map(([date, dateReservations]: [string, any]) => (
                    <div key={date} className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {date === 'No Date' ? 'No Date' : format(parseISO(date), 'EEE, MMM dd')}
                      </div>
                      {(dateReservations as any[])
                        .sort((a, b) => (a.reservation_time || '').localeCompare(b.reservation_time || ''))
                        .map((reservation) => (
                        <div key={reservation.id} className="bg-sand-50 rounded-lg p-3 border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-earth-800 truncate">
                                {reservation.restaurant_name}
                              </h4>
                              <div className="text-xs text-gray-600 mt-1 space-y-1">
                                <div>{formatTime(reservation.reservation_time)}</div>
                                <div>{reservation.number_of_people} people</div>
                                {reservation.cost > 0 && (
                                  <div className="font-medium text-earth-600">
                                    {formatCurrency(reservation.cost, reservation.currency)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleReservationEdit(reservation)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit size={12} />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleReservationDelete(reservation.id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo Section - Only show in trip context */}
      {tripId && (
        <div className="p-4 pt-16 border-b border-sand-200">
          <LogoFromSupabase 
            logoName="Sand Simple.png" 
            className="h-8 w-auto"
            fallbackText="WanderLuxe"
            fallbackClassName="text-xl font-bold text-earth-600"
          />
        </div>
      )}
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {/* Back to Trips */}
            {tripId && (
              <Button
                variant="ghost"
                onClick={handleBackToTrips}
                className="w-full justify-start mb-4 text-earth-600 hover:text-earth-700 hover:bg-sand-100"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Trips
              </Button>
            )}

            {/* Trip Navigation */}
            {tripId ? (
              <>
                {tripNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <div key={item.id}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        onClick={() => {
                          if (item.id === 'timeline') {
                            // Handle timeline expansion
                            toggleExpanded('timeline');
                          } else {
                            onTabChange(item.id);
                          }
                        }}
                        className={cn(
                          "w-full justify-start",
                          isActive ? "bg-sand-200 text-earth-700" : "text-earth-600 hover:text-earth-700 hover:bg-sand-100"
                        )}
                      >
                        <Icon size={16} className="mr-3" />
                        {item.label}
                        {item.id === 'timeline' && (
                          <ChevronDown 
                            size={16} 
                            className={cn(
                              "ml-auto transition-transform",
                              expandedItems.includes('timeline') ? "rotate-180" : ""
                            )}
                          />
                        )}
                      </Button>
                      
                      {/* Timeline Subitems */}
                      {item.id === 'timeline' && (
                        <Collapsible open={expandedItems.includes('timeline')}>
                          <CollapsibleContent className="ml-4 mt-2 space-y-1">
                            <Button
                              variant="ghost"
                              onClick={() => handleSubitemClick('trip-dates')}
                              className="w-full justify-start text-sm text-earth-600 hover:text-earth-700 hover:bg-sand-100"
                            >
                              <CalendarDays size={14} className="mr-2" />
                              Trip Dates
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleSubitemClick('accommodations')}
                              className="w-full justify-start text-sm text-earth-600 hover:text-earth-700 hover:bg-sand-100"
                            >
                              <Building size={14} className="mr-2" />
                              Accommodations
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleSubitemClick('transportation')}
                              className="w-full justify-start text-sm text-earth-600 hover:text-earth-700 hover:bg-sand-100"
                            >
                              <Car size={14} className="mr-2" />
                              Transportation
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleSubitemClick('activities')}
                              className="w-full justify-start text-sm text-earth-600 hover:text-earth-700 hover:bg-sand-100"
                            >
                              <MapPin size={14} className="mr-2" />
                              Activities
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleSubitemClick('reservations')}
                              className="w-full justify-start text-sm text-earth-600 hover:text-earth-700 hover:bg-sand-100"
                            >
                              <UtensilsCrossed size={14} className="mr-2" />
                              Reservations
                            </Button>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  );
                })}
              </>
            ) : (
              /* Main Navigation for non-trip pages */
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/my-trips')}
                  className="w-full justify-start text-earth-600 hover:text-earth-700 hover:bg-sand-100"
                >
                  <Calendar size={16} className="mr-3" />
                  My Trips
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* User Profile Section */}
      <div className="border-t border-sand-200 p-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-earth-500 text-white text-sm">
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-earth-700 truncate">
              {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
            <Settings size={16} />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {renderSecondaryPanel()}
      
      {/* Desktop Sidebar */}
      <div className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] w-[280px] bg-white border-r border-sand-200 z-30">
        {sidebarContent}
      </div>

      {/* Mobile Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu size={16} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      <AccommodationDialog
        open={accommodationOpen}
        onOpenChange={setAccommodationOpen}
        tripId={tripId}
        accommodation={selectedAccommodation}
        tripArrivalDate={trip?.arrival_date}
        tripDepartureDate={trip?.departure_date}
      />

      <TransportationDialog
        open={transportationOpen}
        onOpenChange={setTransportationOpen}
        tripId={tripId}
        transportation={selectedTransportation}
        tripArrivalDate={trip?.arrival_date}
        tripDepartureDate={trip?.departure_date}
      />

      <TripDateEditDialog
        open={tripDatesOpen}
        onOpenChange={setTripDatesOpen}
        tripId={tripId}
        currentArrivalDate={trip?.arrival_date || ''}
        currentDepartureDate={trip?.departure_date || ''}
      />

      <ActivityDialogs
        isAddOpen={activityOpen && !selectedActivity}
        isEditOpen={activityOpen && !!selectedActivity}
        onAddOpenChange={(open) => {
          setActivityOpen(open);
          if (!open) setSelectedActivity(null);
        }}
        onEditOpenChange={(open) => {
          setActivityOpen(open);
          if (!open) setSelectedActivity(null);
        }}
        newActivity={newActivity}
        setNewActivity={setNewActivity}
        activityEdit={activityEdit}
        setActivityEdit={setActivityEdit}
        onAddActivity={handleAddActivity}
        onEditActivity={handleEditActivity}
        editingActivityId={selectedActivity?.activity_id}
        tripArrivalDate={trip?.arrival_date}
        tripDepartureDate={trip?.departure_date}
      />

      <RestaurantReservationDialog
        open={reservationOpen}
        onOpenChange={setReservationOpen}
        tripId={tripId}
        dayId={null}
        reservation={selectedReservation}
        tripArrivalDate={trip?.arrival_date}
        tripDepartureDate={trip?.departure_date}
      />
    </>
  );
};

export default Sidebar;