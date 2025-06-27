import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/components/ui/use-toast";
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
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import NavigationLogo from "../NavigationLogo";
import AccommodationDialog from "../trip/accommodation/AccommodationDialog";
import TransportationDialog from "../trip/transportation/TransportationDialog";
import TripDateEditDialog from "../trip/timeline/TripDateEditDialog";
import ActivityDialogs from "../trip/day/activities/ActivityDialogs";
import RestaurantReservationDialog from "../trip/dining/RestaurantReservationDialog";
import { useTripQuery } from "@/hooks/useTripQuery";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Currency } from '@/utils/currencyConstants';
import { ActivityFormData } from '@/types/trip';
import { generateDatesArray } from '@/services/accommodation/dateUtils';
import { createTripDays } from '@/services/tripDaysService';

// Utility function to format dates without timezone issues
const formatDateSafe = (dateString: string) => {
  if (!dateString || dateString === 'No Date') return 'No Date';
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Utility function to compare dates safely
const compareDatesSafe = (a: string, b: string) => {
  if (a === 'No Date') return 1;
  if (b === 'No Date') return -1;
  return a.localeCompare(b); // Simple string comparison for YYYY-MM-DD format
};

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const tripNavItems = [
  {
    title: "Timeline",
    icon: Calendar,
    href: "timeline",
    children: [
      { title: "Trip Dates", icon: CalendarDays, key: "dates" },
      { title: "Accommodations", icon: Building, key: "accommodations" },
      { title: "Transportation", icon: Car, key: "transportation" },
      { title: "Activities", icon: MapPin, key: "activities" },
      { title: "Reservations", icon: UtensilsCrossed, key: "reservations" },
    ]
  },
  { title: "AI Assistant", icon: MessageCircle, href: "chat" },
  { title: "Vision Board", icon: Lightbulb, href: "vision-board" },
  { title: "Budget", icon: BarChart2, href: "budget" },
  { title: "Booking", icon: Package, href: "booking" },
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
  
  // Trip date editing states
  const [newArrival, setNewArrival] = useState('');
  const [newDeparture, setNewDeparture] = useState('');
  const [isSubmittingDates, setIsSubmittingDates] = useState(false);
  
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
    const savedState = localStorage.getItem('sidebarOpen');
    if (savedState !== null) {
      setIsOpen(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isOpen));
  }, [isOpen]);

  // Trip data
  const { trip, tripLoading } = useTripQuery(tripId);

  // Accommodations query
  const { data: accommodations = [] } = useQuery({
    queryKey: ['accommodations', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('accommodations')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  // Transportation query
  const { data: transportation = [] } = useQuery({
    queryKey: ['transportation', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('transportation')
        .select('*')
        .eq('trip_id', tripId)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  // Activities query with day dates
  const { data: activities = [] } = useQuery({
    queryKey: ['activities', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('day_activities')
        .select(`
          *,
          trip_days!inner(date)
        `)
        .eq('trip_id', tripId)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  // Reservations query with day dates
  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          trip_days!inner(date)
        `)
        .eq('trip_id', tripId)
        .order('reservation_time', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

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

  const handleSubitemClick = (key: string) => {
    setSecondaryPanel(secondaryPanel === key ? null : key);
  };

  const handleAccommodationAdd = () => {
    setSelectedAccommodation(null);
    setAccommodationOpen(true);
  };

  const handleAccommodationEdit = (accommodation: any) => {
    setSelectedAccommodation(accommodation);
    setAccommodationOpen(true);
  };

  const handleAccommodationDelete = async (stayId: string) => {
    try {
      const { error } = await supabase
        .from('accommodations')
        .delete()
        .eq('stay_id', stayId)
        .eq('trip_id', tripId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      toast({ title: 'Success', description: 'Accommodation deleted' });
    } catch (error) {
      console.error('Error deleting accommodation:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete accommodation' });
    }
  };

  const handleTransportationAdd = () => {
    setSelectedTransportation(null);
    setTransportationOpen(true);
  };

  const handleTransportationEdit = (transport: any) => {
    setSelectedTransportation(transport);
    setTransportationOpen(true);
  };

  const handleTransportationDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transportation')
        .delete()
        .eq('id', id)
        .eq('trip_id', tripId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['transportation'] });
      toast({ title: 'Success', description: 'Transportation deleted' });
    } catch (error) {
      console.error('Error deleting transportation:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete transportation' });
    }
  };

  const handleReservationAdd = () => {
    setSelectedReservation(null);
    setReservationOpen(true);
  };

  const handleReservationEdit = (reservation: any) => {
    setSelectedReservation(reservation);
    setReservationOpen(true);
  };

  const handleReservationDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id)
        .eq('trip_id', tripId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast({ title: 'Success', description: 'Reservation deleted' });
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete reservation' });
    }
  };

  const handleActivityAdd = () => {
    setNewActivity({
      title: '',
      description: '',
      date: '',
      start_time: '',
      end_time: '',
      cost: '',
      currency: 'USD' as Currency
    });
    setActivityOpen(true);
  };

  const handleActivityEdit = (activity: any) => {
    setSelectedActivity(activity.id);
    setActivityEdit({
      title: activity.title || '',
      description: activity.description || '',
      date: activity.trip_days?.date || '',
      start_time: activity.start_time || '',
      end_time: activity.end_time || '',
      cost: activity.cost?.toString() || '',
      currency: (activity.currency as Currency) || 'USD'
    });
  };

  const handleActivityDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .delete()
        .eq('id', id)
        .eq('trip_id', tripId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({ title: 'Success', description: 'Activity deleted' });
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete activity' });
    }
  };

  // Activity dialog handlers for ActivityDialogs component
  const handleAddActivity = async (activity: ActivityFormData) => {
    try {
      if (!activity.title.trim()) {
        throw new Error('Activity title is required');
      }

      // Find the day_id based on the selected date
      const { data: tripDay, error: tripDayError } = await supabase
        .from('trip_days')
        .select('day_id')
        .eq('trip_id', tripId)
        .eq('date', activity.date)
        .single();

      if (tripDayError || !tripDay) {
        throw new Error('Could not find trip day for selected date');
      }

      const costAsNumber = activity.cost && activity.cost.trim() !== '' 
        ? parseFloat(activity.cost) 
        : null;

      const newActivity = {
        day_id: tripDay.day_id,
        trip_id: tripId,
        title: activity.title.trim(),
        description: activity.description?.trim() || null,
        start_time: activity.start_time || null,
        end_time: activity.end_time || null,
        cost: costAsNumber,
        currency: activity.currency || 'USD',
        order_index: 0, // Will be adjusted by the database
      };

      const { error } = await supabase
        .from('day_activities')
        .insert(newActivity);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
      setActivityOpen(false);
    } catch (error) {
      console.error('Error adding activity:', error);
      throw error;
    }
  };

  const handleEditActivity = async (id: string, updatedActivity: ActivityFormData) => {
    try {
      if (!updatedActivity.title.trim()) {
        throw new Error('Activity title is required');
      }

      // Find the day_id based on the selected date
      const { data: tripDay, error: tripDayError } = await supabase
        .from('trip_days')
        .select('day_id')
        .eq('trip_id', tripId)
        .eq('date', updatedActivity.date)
        .single();

      if (tripDayError || !tripDay) {
        throw new Error('Could not find trip day for selected date');
      }

      const costAsNumber = updatedActivity.cost && updatedActivity.cost.trim() !== '' 
        ? parseFloat(updatedActivity.cost) 
        : null;

      const updates = {
        day_id: tripDay.day_id,
        title: updatedActivity.title.trim(),
        description: updatedActivity.description?.trim() || null,
        start_time: updatedActivity.start_time || null,
        end_time: updatedActivity.end_time || null,
        cost: costAsNumber,
        currency: updatedActivity.currency || 'USD',
      };

      const { error } = await supabase
        .from('day_activities')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
      setSelectedActivity(null);
    } catch (error) {
      console.error('Error editing activity:', error);
      throw error;
    }
  };

  const handleEditDates = () => {
    // Initialize date state when opening dialog
    if (trip?.arrival_date) setNewArrival(trip.arrival_date);
    if (trip?.departure_date) setNewDeparture(trip.departure_date);
    setTripDatesOpen(true);
  };

  // Date editing utility functions (adapted from TripDates.tsx)
  const addNewTripDays = async (oldArr: string, oldDep: string, newArr: string, newDep: string) => {
    const oldDates = generateDatesArray(oldArr, oldDep);
    const newDates = generateDatesArray(newArr, newDep);
    const toAdd = newDates.filter(d => !oldDates.includes(d));
    if (!toAdd.length) return;
    try {
      await createTripDays(tripId || '', toAdd);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add new trip days' });
    }
  };

  const saveDateChanges = async (arr: string, dep: string) => {
    const { error } = await supabase
      .from('trips')
      .update({ arrival_date: arr, departure_date: dep })
      .eq('trip_id', tripId);
    if (error) throw error;

    if (trip?.arrival_date && trip?.departure_date) {
      await addNewTripDays(trip.arrival_date, trip.departure_date, arr, dep);
    } else {
      const allDates = generateDatesArray(arr, dep);
      await createTripDays(tripId || '', allDates);
    }

    toast({ title: 'Success', description: 'Trip dates updated' });
    setTripDatesOpen(false);
    setIsSubmittingDates(false);
  };

  const handleSaveDates = async () => {
    if (!newArrival || !newDeparture) {
      toast({ variant: 'destructive', title: 'Error', description: 'Both arrival and departure dates are required' });
      return;
    }
    setIsSubmittingDates(true);

    try {
      await saveDateChanges(newArrival, newDeparture);
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    } catch (error) {
      console.error('Error updating trip dates:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update trip dates' });
      setIsSubmittingDates(false);
    }
  };

  const renderSecondaryPanel = () => {
    if (!secondaryPanel) return null;

    switch (secondaryPanel) {
      case 'accommodations':
        return (
          <div className="fixed left-0 md:left-[280px] top-16 h-[calc(100vh-4rem)] w-full md:w-[320px] bg-white border-r border-sand-200 z-40 overflow-y-auto">
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
                  <p className="text-sand-600 text-sm">No accommodations added yet.</p>
                ) : (
                  (() => {
                    // Group accommodations by check-in date
                    const grouped = accommodations.reduce((acc, accommodation) => {
                      const date = accommodation.hotel_checkin_date || 'No Date';
                      if (!acc[date]) {
                        acc[date] = [];
                      }
                      acc[date].push(accommodation);
                      return acc;
                    }, {} as Record<string, typeof accommodations>);

                    // Sort dates chronologically
                    const sortedDates = Object.keys(grouped).sort(compareDatesSafe);

                    return sortedDates.map((date) => (
                      <div key={date} className="space-y-2">
                        <h5 className="font-medium text-xs text-earth-700 border-b border-sand-200 pb-1">
                          {formatDateSafe(date)}
                        </h5>
                        {grouped[date]
                          .sort((a, b) => {
                            if (!a.checkin_time) return 1;
                            if (!b.checkin_time) return -1;
                            return a.checkin_time.localeCompare(b.checkin_time);
                          })
                          .map((accommodation) => (
                            <div key={accommodation.stay_id} className="p-3 bg-sand-50 rounded-lg ml-2">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm">{accommodation.hotel}</h4>
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleAccommodationEdit(accommodation)}
                                  >
                                    <Edit size={12} />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0 text-red-500"
                                    onClick={() => handleAccommodationDelete(accommodation.stay_id)}
                                  >
                                    <Trash2 size={12} />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-xs text-sand-600 space-y-1">
                                {(() => {
                                  // Format time as 9:00am
                                  const formatTime = (time: string) => {
                                    if (!time) return '';
                                    try {
                                      const date = new Date(`2000-01-01T${time}`);
                                      return date.toLocaleTimeString('en-US', { 
                                        hour: 'numeric', 
                                        minute: '2-digit',
                                        hour12: true 
                                      }).toLowerCase();
                                    } catch {
                                      return time;
                                    }
                                  };

                                  // Format date as MM/DD
                                  const formatDate = (dateStr: string) => {
                                    if (!dateStr) return '';
                                    try {
                                      const date = new Date(dateStr);
                                      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
                                    } catch {
                                      return dateStr;
                                    }
                                  };

                                  const checkinDate = formatDate(accommodation.hotel_checkin_date || '');
                                  const checkoutDate = formatDate(accommodation.hotel_checkout_date || '');
                                  const checkinTime = formatTime(accommodation.checkin_time || '');
                                  const checkoutTime = formatTime(accommodation.checkout_time || '');

                                  const result = [];
                                  if (checkinDate || checkinTime) {
                                    result.push(`Check-in: ${checkinDate}${checkinTime ? ` ${checkinTime}` : ''}`);
                                  }
                                  if (checkoutDate || checkoutTime) {
                                    result.push(`Check-out: ${checkoutDate}${checkoutTime ? ` ${checkoutTime}` : ''}`);
                                  }
                                  
                                  return result.map((line, index) => (
                                    <div key={index}>{line}</div>
                                  ));
                                })()}
                              </div>
                              {accommodation.cost && (
                                <p className="text-xs text-sand-600">
                                  {accommodation.currency || 'USD'} {accommodation.cost.toLocaleString()}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          </div>
        );

      case 'transportation':
        return (
          <div className="fixed left-0 md:left-[280px] top-16 h-[calc(100vh-4rem)] w-full md:w-[320px] bg-white border-r border-sand-200 z-40 overflow-y-auto">
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
                  <p className="text-sand-600 text-sm">No transportation added yet.</p>
                ) : (
                  (() => {
                    // Group transportation by start_date
                    const grouped = transportation.reduce((acc, transport) => {
                      const date = transport.start_date || 'No Date';
                      if (!acc[date]) acc[date] = [];
                      acc[date].push(transport);
                      return acc;
                    }, {} as Record<string, typeof transportation>);

                    // Sort dates chronologically
                    const sortedDates = Object.keys(grouped).sort(compareDatesSafe);

                    return sortedDates.map(date => (
                      <div key={date} className="space-y-2">
                        <h5 className="font-medium text-xs text-earth-700 border-b border-sand-200 pb-1">
                          {formatDateSafe(date)}
                        </h5>
                        {grouped[date]
                          .sort((a, b) => {
                            if (!a.start_time) return 1;
                            if (!b.start_time) return -1;
                            return a.start_time.localeCompare(b.start_time);
                          })
                          .map((transport) => (
                            <div key={transport.id} className="p-3 bg-sand-50 rounded-lg ml-2">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm">{transport.departure_location} - {transport.arrival_location}</h4>
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleTransportationEdit(transport)}
                                  >
                                    <Edit size={12} />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0 text-red-500"
                                    onClick={() => handleTransportationDelete(transport.id)}
                                  >
                                    <Trash2 size={12} />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-sand-600">{transport.type}</p>
                              <p className="text-xs text-sand-600">
                                {(() => {
                                  // Format time as 9:00pm - 10:00pm
                                  const formatTime = (time: string) => {
                                    if (!time) return '';
                                    try {
                                      const date = new Date(`2000-01-01T${time}`);
                                      return date.toLocaleTimeString('en-US', { 
                                        hour: 'numeric', 
                                        minute: '2-digit',
                                        hour12: true 
                                      }).toLowerCase();
                                    } catch {
                                      return time;
                                    }
                                  };

                                  const startTime = formatTime(transport.start_time || '');
                                  const endTime = formatTime(transport.end_time || '');
                                  
                                  // Check if end date is different from start date
                                  const isDifferentDate = transport.end_date && transport.start_date && 
                                    transport.end_date !== transport.start_date;
                                  
                                  let timeDisplay = '';
                                  if (startTime && endTime) {
                                    timeDisplay = `${startTime} - ${endTime}`;
                                    
                                    if (isDifferentDate) {
                                      // Format end date as 12/30 without timezone issues
                                      const [year, month, day] = transport.end_date.split('-');
                                      const formattedEndDate = `${parseInt(month)}/${parseInt(day)}`;
                                      timeDisplay += ` (${formattedEndDate})`;
                                    }
                                  } else if (startTime) {
                                    timeDisplay = startTime;
                                  }
                                  
                                  return timeDisplay;
                                })()}
                              </p>
                              {transport.cost && (
                                <p className="text-xs text-sand-600">
                                  {transport.currency || 'USD'} {transport.cost.toLocaleString()}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          </div>
        );

      case 'dates':
        return (
          <div className="fixed left-0 md:left-[280px] top-16 h-[calc(100vh-4rem)] w-full md:w-[320px] bg-white border-r border-sand-200 z-40 overflow-y-auto">
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
                  <div className="p-3 bg-sand-50 rounded-lg">
                    <p className="text-sm font-medium text-earth-600">Arrival Date</p>
                    <p className="text-sm text-sand-700">{trip.arrival_date}</p>
                  </div>
                  <div className="p-3 bg-sand-50 rounded-lg">
                    <p className="text-sm font-medium text-earth-600">Departure Date</p>
                    <p className="text-sm text-sand-700">{trip.departure_date}</p>
                  </div>
                  <div className="p-3 bg-sand-50 rounded-lg">
                    <p className="text-sm font-medium text-earth-600">Duration</p>
                    <p className="text-sm text-sand-700">
                      {Math.ceil((new Date(trip.departure_date).getTime() - new Date(trip.arrival_date).getTime()) / (1000 * 60 * 60 * 24))} nights
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'activities':
        return (
          <div className="fixed left-0 md:left-[280px] top-16 h-[calc(100vh-4rem)] w-full md:w-[320px] bg-white border-r border-sand-200 z-40 overflow-y-auto">
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
                  <p className="text-sand-600 text-sm">No activities added yet.</p>
                ) : (
                  (() => {
                    // Group activities by date and sort chronologically
                    const grouped = activities.reduce((acc, activity) => {
                      const date = (activity as any).trip_days?.date || 'No Date';
                      if (!acc[date]) acc[date] = [];
                      acc[date].push(activity);
                      return acc;
                    }, {} as Record<string, any[]>);

                    // Sort dates and activities within each date
                    const sortedDates = Object.keys(grouped).sort(compareDatesSafe);

                    return sortedDates.map(date => (
                      <div key={date} className="space-y-2">
                        <h5 className="font-medium text-xs text-earth-700 border-b border-sand-200 pb-1">
                          {formatDateSafe(date)}
                        </h5>
                        {grouped[date]
                          .sort((a, b) => {
                            if (!a.start_time) return 1;
                            if (!b.start_time) return -1;
                            return a.start_time.localeCompare(b.start_time);
                          })
                          .map((activity) => (
                            <div key={activity.id} className="p-3 bg-sand-50 rounded-lg ml-2">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm">{activity.title}</h4>
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleActivityEdit(activity)}
                                  >
                                    <Edit size={12} />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0 text-red-500"
                                    onClick={() => handleActivityDelete(activity.id)}
                                  >
                                    <Trash2 size={12} />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-sand-600">
                                {(() => {
                                  // Format time as 9:00am - 10:00pm
                                  const formatTime = (time: string) => {
                                    if (!time) return '';
                                    try {
                                      const date = new Date(`2000-01-01T${time}`);
                                      return date.toLocaleTimeString('en-US', { 
                                        hour: 'numeric', 
                                        minute: '2-digit',
                                        hour12: true 
                                      }).toLowerCase();
                                    } catch {
                                      return time;
                                    }
                                  };

                                  const startTime = formatTime(activity.start_time || '');
                                  const endTime = formatTime(activity.end_time || '');
                                  
                                  if (startTime && endTime) {
                                    return `${startTime} - ${endTime}`;
                                  } else if (startTime) {
                                    return startTime;
                                  }
                                  return '';
                                })()}
                              </p>
                              {activity.description && (
                                <p className="text-xs text-sand-600">{activity.description}</p>
                              )}
                              {activity.cost && (
                                <p className="text-xs text-sand-600">
                                  {activity.currency || 'USD'} {activity.cost.toLocaleString()}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          </div>
        );

      case 'reservations':
        return (
          <div className="fixed left-0 md:left-[280px] top-16 h-[calc(100vh-4rem)] w-full md:w-[320px] bg-white border-r border-sand-200 z-40 overflow-y-auto">
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
                {reservations.length === 0 ? (
                  <p className="text-sand-600 text-sm">No reservations added yet.</p>
                ) : (
                  (() => {
                    // Group reservations by date from trip_days relationship
                    const grouped = reservations.reduce((acc, reservation) => {
                      const date = reservation.trip_days?.date || 'No Date';
                      if (!acc[date]) acc[date] = [];
                      acc[date].push(reservation);
                      return acc;
                    }, {} as Record<string, typeof reservations>);

                    // Sort dates chronologically
                    const sortedDates = Object.keys(grouped).sort(compareDatesSafe);

                    return sortedDates.map(date => (
                      <div key={date} className="space-y-2">
                        <h5 className="font-medium text-xs text-earth-700 border-b border-sand-200 pb-1">
                          {formatDateSafe(date)}
                        </h5>
                        {grouped[date]
                          .sort((a, b) => {
                            if (!a.reservation_time) return 1;
                            if (!b.reservation_time) return -1;
                            return a.reservation_time.localeCompare(b.reservation_time);
                          })
                          .map((reservation) => (
                            <div key={reservation.id} className="p-3 bg-sand-50 rounded-lg ml-2">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm">{reservation.restaurant_name}</h4>
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleReservationEdit(reservation)}
                                  >
                                    <Edit size={12} />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0 text-red-500"
                                    onClick={() => handleReservationDelete(reservation.id)}
                                  >
                                    <Trash2 size={12} />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-sand-600">
                                {(() => {
                                  // Format time as 9:00am - 10:00pm
                                  const formatTime = (time: string) => {
                                    if (!time) return '';
                                    try {
                                      const date = new Date(`2000-01-01T${time}`);
                                      return date.toLocaleTimeString('en-US', { 
                                        hour: 'numeric', 
                                        minute: '2-digit',
                                        hour12: true 
                                      }).toLowerCase();
                                    } catch {
                                      return time;
                                    }
                                  };

                                  return formatTime(reservation.reservation_time || '');
                                })()}
                              </p>
                              <p className="text-xs text-sand-600">
                                {reservation.number_of_people && `${reservation.number_of_people} people`}
                              </p>
                              {reservation.cost && (
                                <p className="text-xs text-sand-600">
                                  {reservation.currency || 'USD'} {reservation.cost.toLocaleString()}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    ));
                  })()
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
      <div className="p-4 border-b border-sand-200 pt-6">
        <NavigationLogo />
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2 py-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-sand-600 hover:text-earth-600 hover:bg-sand-50"
            onClick={handleBackToTrips}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Trips
          </Button>

          <Separator className="my-4" />

          {tripNavItems.map((item) => (
            <div key={item.title}>
              <Collapsible 
                open={expandedItems.includes(item.title.toLowerCase())}
                onOpenChange={() => toggleExpanded(item.title.toLowerCase())}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between text-left",
                      activeTab === item.href 
                        ? "bg-earth-100 text-earth-700 font-medium" 
                        : "text-sand-600 hover:text-earth-600 hover:bg-sand-50"
                    )}
                    onClick={() => {
                      onTabChange(item.href);
                      onTabChange(item.href);
                    }}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </div>
                    {item.children && (
                      expandedItems.includes(item.title.toLowerCase()) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    )}
                  </Button>
                </CollapsibleTrigger>

                {item.children && (
                  <CollapsibleContent className="ml-6 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Button
                        key={child.key}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-xs",
                          secondaryPanel === child.key
                            ? "bg-earth-50 text-earth-600 font-medium"
                            : "text-sand-500 hover:text-earth-500 hover:bg-sand-50"
                        )}
                        onClick={() => handleSubitemClick(child.key)}
                      >
                        <child.icon className="mr-2 h-3 w-3" />
                        {child.title}
                      </Button>
                    ))}
                  </CollapsibleContent>
                )}
              </Collapsible>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-sand-200">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-earth-100 text-earth-600">
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sand-700 truncate">
              {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          <NavLink to="/settings">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </NavLink>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <div className="fixed left-0 top-0 h-full w-[280px] bg-white border-r border-sand-200 z-30">
          {sidebarContent}
        </div>
        {renderSecondaryPanel()}
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="fixed top-4 left-4 z-50 bg-white shadow-md">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Dialogs */}
      <AccommodationDialog
        open={accommodationOpen}
        onOpenChange={setAccommodationOpen}
        initialData={selectedAccommodation}
        tripId={tripId || ''}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
          queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] });
          setSelectedAccommodation(null);
        }}
      />

      <TransportationDialog
        open={transportationOpen}
        onOpenChange={setTransportationOpen}
        initialData={selectedTransportation}
        tripId={tripId || ''}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
        }}
      />

      <TripDateEditDialog
        isOpen={tripDatesOpen}
        onOpenChange={setTripDatesOpen}
        arrivalDate={newArrival}
        departureDate={newDeparture}
        onArrivalChange={setNewArrival}
        onDepartureChange={setNewDeparture}
        onSave={handleSaveDates}
      />

      <RestaurantReservationDialog
        isOpen={reservationOpen}
        onOpenChange={setReservationOpen}
        editingReservation={selectedReservation}
        tripId={tripId || ''}
        title={selectedReservation ? 'Edit Reservation' : 'Add Reservation'}
        isSubmitting={false}
        tripArrivalDate={trip?.arrival_date}
        tripDepartureDate={trip?.departure_date}
        onSubmit={async (data) => {
          try {
            if (selectedReservation) {
              // Update existing reservation
              const { error } = await supabase
                .from('reservations')
                .update(data)
                .eq('id', selectedReservation.id)
                .eq('trip_id', tripId);
              
              if (error) throw error;
              toast({ title: 'Success', description: 'Reservation updated' });
            } else {
              // Create new reservation
              const { error } = await supabase
                .from('reservations')
                .insert([data]);
              
              if (error) throw error;
              toast({ title: 'Success', description: 'Reservation added' });
            }
            
            queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
            setReservationOpen(false);
            setSelectedReservation(null);
          } catch (error) {
            console.error('Failed to save reservation:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save reservation' });
          }
        }}
      />

      <ActivityDialogs
        isAddingActivity={activityOpen}
        setIsAddingActivity={setActivityOpen}
        editingActivity={selectedActivity}
        setEditingActivity={setSelectedActivity}
        newActivity={newActivity}
        setNewActivity={setNewActivity}
        activityEdit={activityEdit}
        setActivityEdit={setActivityEdit}
        onAddActivity={handleAddActivity}
        onEditActivity={handleEditActivity}
        onDeleteActivity={handleActivityDelete}
        eventId={tripId || ''}
        tripDates={trip ? { arrival_date: trip.arrival_date, departure_date: trip.departure_date } : undefined}
      />
    </>
  );
};

export default Sidebar;