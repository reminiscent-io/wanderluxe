import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTripQuery } from '@/hooks/useTripQuery';
import { toast } from '@/components/ui/use-toast';
import { Currency } from '@/utils/currencyConstants';
import { ActivityFormData } from '@/types/trip';
import { generateDatesArray } from '@/services/accommodation/dateUtils';
import { createTripDays } from '@/services/tripDaysService';

export interface SidebarState {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  expandedItems: string[];
  toggleExpanded: (item: string) => void;
  secondaryPanel: string | null;
  setSecondaryPanel: (panel: string | null) => void;
  // Dialog open states
  accommodationOpen: boolean;
  setAccommodationOpen: (open: boolean) => void;
  transportationOpen: boolean;
  setTransportationOpen: (open: boolean) => void;
  tripDatesOpen: boolean;
  setTripDatesOpen: (open: boolean) => void;
  activityOpen: boolean;
  setActivityOpen: (open: boolean) => void;
  reservationOpen: boolean;
  setReservationOpen: (open: boolean) => void;
  // Selected items for editing
  selectedAccommodation: any;
  setSelectedAccommodation: (item: any) => void;
  selectedTransportation: any;
  setSelectedTransportation: (item: any) => void;
  selectedActivity: any;
  setSelectedActivity: (item: any) => void;
  selectedReservation: any;
  setSelectedReservation: (item: any) => void;
  // Activity form state
  newActivity: ActivityFormData;
  setNewActivity: (data: ActivityFormData) => void;
  activityEdit: ActivityFormData;
  setActivityEdit: (data: ActivityFormData) => void;
  // Trip date editing state
  newArrival: string;
  setNewArrival: (date: string) => void;
  newDeparture: string;
  setNewDeparture: (date: string) => void;
  // Data from queries
  trip: any;
  tripLoading: boolean;
  accommodations: any[];
  transportation: any[];
  activities: any[];
  reservations: any[];
  // Action handlers
  handleBackToTrips: () => void;
  handleSubitemClick: (key: string) => void;
  handleAccommodationAdd: () => void;
  handleAccommodationEdit: (accommodation: any) => void;
  handleAccommodationDelete: (stayId: string) => Promise<void>;
  handleTransportationAdd: () => void;
  handleTransportationEdit: (transport: any) => void;
  handleTransportationDelete: (id: string) => Promise<void>;
  handleReservationAdd: () => void;
  handleReservationEdit: (reservation: any) => void;
  handleReservationDelete: (id: string) => Promise<void>;
  handleActivityAdd: () => void;
  handleActivityEdit: (activity: any) => void;
  handleActivityDelete: (id: string) => Promise<void>;
  handleEditDates: () => void;
  handleSaveDates: () => Promise<void>;
  handleAddActivity: (activity: ActivityFormData) => Promise<void>;
  handleEditActivity: (id: string, data: ActivityFormData) => Promise<void>;
}

/**
 * Manage all sidebar state, data, and handlers for a given trip.
 */
export function useSidebarState(tripId: string | undefined): SidebarState {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Sidebar open/closed and expanded menu state
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['timeline']);
  const [secondaryPanel, setSecondaryPanel] = useState<string | null>(null);

  // Dialog open states
  const [accommodationOpen, setAccommodationOpen] = useState(false);
  const [transportationOpen, setTransportationOpen] = useState(false);
  const [tripDatesOpen, setTripDatesOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);

  // Trip date editing fields
  const [newArrival, setNewArrival] = useState('');
  const [newDeparture, setNewDeparture] = useState('');
  const [isSubmittingDates, setIsSubmittingDates] = useState(false);

  // Selected items for editing
  const [selectedAccommodation, setSelectedAccommodation] = useState<any>(null);
  const [selectedTransportation, setSelectedTransportation] = useState<any>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  // Activity form state for adding/editing
  const initialActivityForm: ActivityFormData = {
    title: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD' as Currency,
  };
  const [newActivity, setNewActivity] = useState<ActivityFormData>({ ...initialActivityForm });
  const [activityEdit, setActivityEdit] = useState<ActivityFormData>({ ...initialActivityForm });

  // Load sidebar open state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarOpen');
    if (savedState !== null) {
      setIsOpen(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar open state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isOpen));
  }, [isOpen]);

  // Fetch trip basic data
  const { trip, tripLoading } = useTripQuery(tripId);

  // Fetch accommodations list for this trip
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
    enabled: !!tripId,
  });

  // Fetch transportation list for this trip
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
    enabled: !!tripId,
  });

  // Fetch activities (day_activities with trip_days date) for this trip
  const { data: activities = [] } = useQuery({
    queryKey: ['activities', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('day_activities')
        .select('*, trip_days!inner(date)')
        .eq('trip_id', tripId)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId,
  });

  // Fetch reservations (with trip_days date) for this trip
  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('reservations')
        .select('*, trip_days!inner(date)')
        .eq('trip_id', tripId)
        .order('reservation_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId,
  });

  // Toggle expansion of a primary nav section
  const toggleExpanded = (item: string) => {
    setExpandedItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  // Navigate back to "My Trips" list
  const handleBackToTrips = () => {
    navigate('/my-trips');
  };

  // Handle clicking a secondary panel item (open/close panel)
  const handleSubitemClick = (key: string) => {
    const isCurrentlyOpen = secondaryPanel === key;
    setSecondaryPanel(isCurrentlyOpen ? null : key);
    // On mobile, close the main sidebar sheet when opening a panel
    if (!isCurrentlyOpen && typeof window !== 'undefined') {
      if (window.innerWidth < 768) {
        setIsOpen(false);
      }
    }
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
    } catch (err) {
      console.error('Error deleting accommodation:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete accommodation' });
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
    } catch (err) {
      console.error('Error deleting transportation:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete transportation' });
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
    } catch (err) {
      console.error('Error deleting reservation:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete reservation' });
    }
  };

  // Activity handlers (open add/edit dialogs)
  const handleActivityAdd = () => {
    setNewActivity({ ...initialActivityForm });
    setActivityOpen(true);
  };
  const handleActivityEdit = (activity: any) => {
    // Prepare edit form data for the selected activity
    setSelectedActivity(activity.id);
    setActivityEdit({
      title: activity.title || '',
      description: activity.description || '',
      date: activity.trip_days?.date || '',
      start_time: activity.start_time || '',
      end_time: activity.end_time || '',
      cost: activity.cost ? String(activity.cost) : '',
      currency: (activity.currency as Currency) || 'USD',
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
    } catch (err) {
      console.error('Error deleting activity:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete activity' });
    }
  };

  // Add new activity to the database (called from ActivityDialogs on submit)
  const handleAddActivity = async (activity: ActivityFormData) => {
    try {
      if (!activity.title.trim()) {
        throw new Error('Activity title is required');
      }
      // Find the corresponding day_id for the selected date
      const { data: tripDay, error: tripDayError } = await supabase
        .from('trip_days')
        .select('day_id')
        .eq('trip_id', tripId)
        .eq('date', activity.date)
        .single();
      if (tripDayError || !tripDay) {
        throw new Error('Could not find trip day for selected date');
      }
      const costNum = activity.cost && activity.cost.trim() !== '' ? parseFloat(activity.cost) : null;
      const newActivityEntry = {
        day_id: tripDay.day_id,
        trip_id: tripId,
        title: activity.title.trim(),
        description: activity.description?.trim() || null,
        start_time: activity.start_time || null,
        end_time: activity.end_time || null,
        cost: costNum,
        currency: activity.currency || 'USD',
        order_index: 0,
      };
      const { error } = await supabase.from('day_activities').insert(newActivityEntry);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
      setActivityOpen(false);
    } catch (err) {
      console.error('Error adding activity:', err);
      throw err;
    }
  };

  // Update an existing activity in the database (called from ActivityDialogs on submit)
  const handleEditActivity = async (id: string, updatedActivity: ActivityFormData) => {
    try {
      if (!updatedActivity.title.trim()) {
        throw new Error('Activity title is required');
      }
      const { data: tripDay, error: tripDayError } = await supabase
        .from('trip_days')
        .select('day_id')
        .eq('trip_id', tripId)
        .eq('date', updatedActivity.date)
        .single();
      if (tripDayError || !tripDay) {
        throw new Error('Could not find trip day for selected date');
      }
      const costNum = updatedActivity.cost && updatedActivity.cost.trim() !== '' ? parseFloat(updatedActivity.cost) : null;
      const updates = {
        day_id: tripDay.day_id,
        title: updatedActivity.title.trim(),
        description: updatedActivity.description?.trim() || null,
        start_time: updatedActivity.start_time || null,
        end_time: updatedActivity.end_time || null,
        cost: costNum,
        currency: updatedActivity.currency || 'USD',
      };
      const { error } = await supabase.from('day_activities').update(updates).eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
      setSelectedActivity(null);
    } catch (err) {
      console.error('Error editing activity:', err);
      throw err;
    }
  };

  // Open the Trip Dates edit dialog with current dates pre-filled
  const handleEditDates = () => {
    if (trip?.arrival_date) setNewArrival(trip.arrival_date);
    if (trip?.departure_date) setNewDeparture(trip.departure_date);
    setTripDatesOpen(true);
  };

  // Check for days that need to be removed when date range is shortened
  const checkDaysToRemove = async (oldArr: string, oldDep: string, newArr: string, newDep: string) => {
    const oldDates = generateDatesArray(oldArr, oldDep);
    const newDates = generateDatesArray(newArr, newDep);
    const toRemove = oldDates.filter(d => !newDates.includes(d));
    if (!toRemove.length) return null;

    try {
      const { data: daysData, error: daysErr } = await supabase
        .from('trip_days')
        .select('day_id')
        .eq('trip_id', tripId)
        .in('date', toRemove);
      if (daysErr) throw daysErr;

      if (!daysData?.length) return null;

      const dayIds = daysData.map(d => d.day_id);
      const { data: activitiesData, error: activitiesErr } = await supabase
        .from('day_activities')
        .select('id')
        .in('day_id', dayIds);
      if (activitiesErr) throw activitiesErr;

      return {
        dayCount: daysData.length,
        activityCount: activitiesData?.length || 0,
        dates: toRemove
      };
    } catch (err) {
      console.error('Error checking days to remove:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to check affected days' });
      return null;
    }
  };

  // Remove trip days and associated activities
  const removeTripDays = async (dates: string[]) => {
    const { data: daysData, error: daysErr } = await supabase
      .from('trip_days')
      .select('day_id')
      .eq('trip_id', tripId)
      .in('date', dates);
    if (daysErr) throw daysErr;

    if (daysData?.length) {
      const ids = daysData.map(d => d.day_id);
      await supabase.from('day_activities').delete().in('day_id', ids);
      await supabase.from('trip_days').delete().in('day_id', ids);
    }
  };

  // Utility to add new trip_days if trip dates have been extended
  const addNewTripDays = async (oldArr: string, oldDep: string, newArr: string, newDep: string) => {
    console.log('addNewTripDays called with:', { oldArr, oldDep, newArr, newDep });
    const oldDates = generateDatesArray(oldArr, oldDep);
    const newDates = generateDatesArray(newArr, newDep);
    const toAdd = newDates.filter(d => !oldDates.includes(d));
    console.log('Date comparison - old:', oldDates, 'new:', newDates, 'toAdd:', toAdd);
    if (!toAdd.length) {
      console.log('No new dates to add');
      return;
    }
    try {
      console.log('Creating trip days for dates:', toAdd);
      await createTripDays(tripId || '', toAdd);
      console.log('Successfully created trip days');
    } catch (err) {
      console.error('Failed to add new trip days:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add new trip days' });
    }
  };

  // Save trip date changes (update trip record and handle day additions/removals)
  const saveDateChanges = async (arr: string, dep: string) => {
    console.log('saveDateChanges called with:', { arr, dep, tripId });
    console.log('Current trip data:', trip);
    
    const { error } = await supabase
      .from('trips')
      .update({ arrival_date: arr, departure_date: dep })
      .eq('trip_id', tripId);
    if (error) throw error;
    
    if (trip?.arrival_date && trip?.departure_date) {
      console.log('Taking addNewTripDays path - existing trip has dates');
      await addNewTripDays(trip.arrival_date, trip.departure_date, arr, dep);
    } else {
      console.log('Taking createTripDays path - no existing dates');
      const allDates = generateDatesArray(arr, dep);
      await createTripDays(tripId || '', allDates);
    }
    
    toast({ title: 'Success', description: 'Trip dates updated' });
    setTripDatesOpen(false);
    setIsSubmittingDates(false);
  };

  const handleSaveDates = async (overrideArrival?: string, overrideDeparture?: string) => {
    const finalArrival = overrideArrival || newArrival;
    const finalDeparture = overrideDeparture || newDeparture;
    console.log('handleSaveDates called with finalArrival:', finalArrival, 'finalDeparture:', finalDeparture);
    if (!finalArrival || !finalDeparture) {
      toast({ variant: 'destructive', title: 'Error', description: 'Both arrival and departure dates are required' });
      return;
    }
    setIsSubmittingDates(true);
    
    // Update state for consistency
    if (overrideArrival) setNewArrival(overrideArrival);
    if (overrideDeparture) setNewDeparture(overrideDeparture);

    try {
      // Check if we need to remove any days first
      if (trip?.arrival_date && trip?.departure_date) {
        const daysToRemove = await checkDaysToRemove(trip.arrival_date, trip.departure_date, finalArrival, finalDeparture);
        if (daysToRemove && daysToRemove.dayCount > 0) {
          // For now, automatically remove the days - could add confirmation dialog later
          await removeTripDays(daysToRemove.dates);
        }
      }

      console.log('About to call saveDateChanges with:', finalArrival, finalDeparture);
      await saveDateChanges(finalArrival, finalDeparture);
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });
    } catch (err) {
      console.error('Error updating trip dates:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update trip dates' });
      setIsSubmittingDates(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    expandedItems,
    toggleExpanded,
    secondaryPanel,
    setSecondaryPanel,
    accommodationOpen,
    setAccommodationOpen,
    transportationOpen,
    setTransportationOpen,
    tripDatesOpen,
    setTripDatesOpen,
    activityOpen,
    setActivityOpen,
    reservationOpen,
    setReservationOpen,
    selectedAccommodation,
    setSelectedAccommodation,
    selectedTransportation,
    setSelectedTransportation,
    selectedActivity,
    setSelectedActivity,
    selectedReservation,
    setSelectedReservation,
    newActivity,
    setNewActivity,
    activityEdit,
    setActivityEdit,
    newArrival,
    setNewArrival,
    newDeparture,
    setNewDeparture,
    trip,
    tripLoading,
    accommodations,
    transportation,
    activities,
    reservations,
    handleBackToTrips,
    handleSubitemClick,
    handleAccommodationAdd,
    handleAccommodationEdit,
    handleAccommodationDelete,
    handleTransportationAdd,
    handleTransportationEdit,
    handleTransportationDelete,
    handleReservationAdd,
    handleReservationEdit,
    handleReservationDelete,
    handleActivityAdd,
    handleActivityEdit,
    handleActivityDelete,
    handleEditDates,
    handleSaveDates,
    handleAddActivity,
    handleEditActivity,
  };
}
