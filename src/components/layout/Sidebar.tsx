import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Calendar, 
  MessageSquare, 
  Camera, 
  DollarSign, 
  CalendarDays, 
  Home, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Edit2, 
  Trash2,
  MapPin,
  UtensilsCrossed,
  Plane,
  Car,
  Train,
  Ship,
  Settings,
  User,
  ArrowLeft
} from 'lucide-react';
import LogoFromSupabase from '@/components/LogoFromSupabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTripQuery } from '@/hooks/useTripQuery';
import { useAuth } from '@/contexts/AuthContext';
import AccommodationDialog from '@/components/trip/accommodation/AccommodationDialog';
import TransportationDialog from '@/components/trip/transportation/TransportationDialog';
import TripDateEditDialog from '@/components/trip/timeline/TripDateEditDialog';
import ActivityDialogs from '@/components/trip/day/activities/ActivityDialogs';
import RestaurantReservationDialog from '@/components/trip/dining/RestaurantReservationDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';

interface SidebarProps {
  tripId?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

interface SecondaryPanelProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const tripNavItems = [
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'ai-assistant', label: 'AI Assistant', icon: MessageSquare },
  { id: 'vision-board', label: 'Vision Board', icon: Camera },
  { id: 'budget', label: 'Budget', icon: DollarSign },
  { id: 'booking', label: 'Booking', icon: CalendarDays },
];

const SecondaryPanel = ({ isOpen, title, children, onClose }: SecondaryPanelProps) => (
  <div className={`
    fixed left-[280px] top-0 h-full bg-white border-r border-sand-200 z-40
    transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    w-80
  `}>
    <div className="p-4 border-b border-sand-200">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-sand-900">{title}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
    <div className="p-4 overflow-y-auto h-[calc(100vh-73px)]">
      {children}
    </div>
  </div>
);

export default function Sidebar({ tripId, activeTab, onTabChange }: SidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [secondaryPanel, setSecondaryPanel] = useState<{
    type: 'accommodations' | 'transportation' | 'activities' | 'reservations' | 'dates' | null;
    title: string;
  }>({ type: null, title: '' });

  // Dialog states
  const [accommodationDialog, setAccommodationDialog] = useState({
    open: false,
    mode: 'add' as 'add' | 'edit',
    data: null as any
  });
  
  const [transportationDialog, setTransportationDialog] = useState({
    open: false,
    mode: 'add' as 'add' | 'edit',
    data: null as any
  });
  
  const [activityDialog, setActivityDialog] = useState({
    open: false,
    mode: 'add' as 'add' | 'edit',
    data: null as any
  });
  
  const [reservationDialog, setReservationDialog] = useState({
    open: false,
    mode: 'add' as 'add' | 'edit',
    data: null as any
  });
  
  const [dateEditDialog, setDateEditDialog] = useState(false);

  // Fetch trip data
  const { data: trip } = useTripQuery(tripId);

  // Fetch accommodations
  const { data: accommodations = [] } = useQuery({
    queryKey: ['accommodations', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('accommodations')
        .select('*')
        .eq('trip_id', tripId)
        .order('check_in_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  // Fetch transportation
  const { data: transportation = [] } = useQuery({
    queryKey: ['transportation', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('transportation')
        .select('*')
        .eq('trip_id', tripId)
        .order('departure_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  // Fetch activities
  const { data: activities = [] } = useQuery({
    queryKey: ['activities', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('day_activities')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  // Fetch reservations
  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('trip_id', tripId)
        .order('reservation_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  // Delete functions
  const deleteAccommodation = async (id: string) => {
    await supabase.from('accommodations').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] });
  };

  const deleteTransportation = async (id: string) => {
    await supabase.from('transportation').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
  };

  const deleteActivity = async (id: string) => {
    await supabase.from('day_activities').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
  };

  const deleteReservation = async (id: string) => {
    await supabase.from('reservations').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['reservations', tripId] });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const groupActivitiesByDate = (activities: any[]) => {
    const grouped = activities.reduce((acc, activity) => {
      const date = activity.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(activity);
      return acc;
    }, {} as Record<string, any[]>);

    // Sort activities within each date by start_time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        if (!a.start_time && !b.start_time) return 0;
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return a.start_time.localeCompare(b.start_time);
      });
    });

    return grouped;
  };

  const renderSecondaryPanelContent = () => {
    if (!secondaryPanel.type) return null;

    switch (secondaryPanel.type) {
      case 'accommodations':
        return (
          <div className="space-y-4">
            <Button 
              onClick={() => {
                setAccommodationDialog({ open: true, mode: 'add', data: null });
              }}
              className="w-full"
            >
              <Plus size={16} className="mr-2" />
              Add Accommodation
            </Button>
            
            <div className="space-y-3">
              {accommodations.map((accommodation) => (
                <div key={accommodation.id} className="p-3 bg-sand-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{accommodation.name}</h4>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setAccommodationDialog({ 
                            open: true, 
                            mode: 'edit', 
                            data: accommodation 
                          });
                        }}
                      >
                        <Edit2 size={12} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                        onClick={() => deleteAccommodation(accommodation.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-sand-600 space-y-1">
                    <p>Check-in: {format(new Date(accommodation.check_in_date), 'MMM d, yyyy')}</p>
                    <p>Check-out: {format(new Date(accommodation.check_out_date), 'MMM d, yyyy')}</p>
                    {accommodation.cost && (
                      <p>{accommodation.currency || 'USD'} {accommodation.cost}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'transportation':
        return (
          <div className="space-y-4">
            <Button 
              onClick={() => {
                setTransportationDialog({ open: true, mode: 'add', data: null });
              }}
              className="w-full"
            >
              <Plus size={16} className="mr-2" />
              Add Transportation
            </Button>
            
            <div className="space-y-3">
              {transportation.map((transport) => (
                <div key={transport.id} className="p-3 bg-sand-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {transport.type === 'flight' && <Plane size={14} />}
                      {transport.type === 'car' && <Car size={14} />}
                      {transport.type === 'train' && <Train size={14} />}
                      {transport.type === 'boat' && <Ship size={14} />}
                      <h4 className="font-medium text-sm capitalize">{transport.type}</h4>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setTransportationDialog({ 
                            open: true, 
                            mode: 'edit', 
                            data: transport 
                          });
                        }}
                      >
                        <Edit2 size={12} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                        onClick={() => deleteTransportation(transport.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-sand-600 space-y-1">
                    <p>{transport.departure_location} → {transport.arrival_location}</p>
                    <p>{format(new Date(transport.departure_date), 'MMM d, yyyy')}</p>
                    {transport.cost && (
                      <p>{transport.currency || 'USD'} {transport.cost}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'activities':
        const groupedActivities = groupActivitiesByDate(activities);
        
        return (
          <div className="space-y-4">
            <Button 
              onClick={() => {
                setActivityDialog({ open: true, mode: 'add', data: null });
              }}
              className="w-full"
            >
              <Plus size={16} className="mr-2" />
              Add Activity
            </Button>
            
            <div className="space-y-4">
              {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-sand-700">
                      {format(new Date(date), 'MMM d, yyyy')}
                    </span>
                    <div className="h-px bg-sand-200 flex-1"></div>
                  </div>
                  
                  {dateActivities.map((activity) => (
                    <div key={activity.id} className="p-3 bg-sand-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{activity.title}</h4>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setActivityDialog({ 
                                open: true, 
                                mode: 'edit', 
                                data: activity 
                              });
                            }}
                          >
                            <Edit2 size={12} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                            onClick={() => deleteActivity(activity.id)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-sand-600 space-y-1">
                        {(activity.start_time || activity.end_time) && (
                          <p>
                            {activity.start_time && formatTime(activity.start_time)}
                            {activity.start_time && activity.end_time && ' - '}
                            {activity.end_time && formatTime(activity.end_time)}
                          </p>
                        )}
                        {activity.cost && (
                          <p>{activity.currency || 'USD'} {activity.cost}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );

      case 'reservations':
        return (
          <div className="space-y-4">
            <Button 
              onClick={() => {
                setReservationDialog({ open: true, mode: 'add', data: null });
              }}
              className="w-full"
            >
              <Plus size={16} className="mr-2" />
              Add Reservation
            </Button>
            
            <div className="space-y-3">
              {reservations.map((reservation) => (
                <div key={reservation.id} className="p-3 bg-sand-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{reservation.restaurant_name}</h4>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setReservationDialog({ 
                            open: true, 
                            mode: 'edit', 
                            data: reservation 
                          });
                        }}
                      >
                        <Edit2 size={12} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                        onClick={() => deleteReservation(reservation.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-sand-600 space-y-1">
                    <p>{format(new Date(reservation.reservation_date), 'MMM d, yyyy')}</p>
                    <p>{formatTime(reservation.reservation_time)}</p>
                    <p>{reservation.number_of_people} people</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'dates':
        return (
          <div className="space-y-4">
            <Button 
              onClick={() => setDateEditDialog(true)}
              className="w-full"
            >
              <Edit2 size={16} className="mr-2" />
              Edit Dates
            </Button>
            
            {trip && (
              <div className="space-y-4">
                <div className="p-3 bg-sand-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Trip Duration</h4>
                  <div className="text-xs text-sand-600 space-y-1">
                    <p>Arrival: {format(new Date(trip.arrival_date), 'MMM d, yyyy')}</p>
                    <p>Departure: {format(new Date(trip.departure_date), 'MMM d, yyyy')}</p>
                    <p>Duration: {differenceInDays(new Date(trip.departure_date), new Date(trip.arrival_date))} nights</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Logo Section - Only show when in trip context */}
      {tripId && (
        <div className="p-4 border-b border-sand-200">
          <LogoFromSupabase 
            logoName="Black Simple.png" 
            className="h-8 w-auto"
            fallbackText="WanderLuxe"
            fallbackClassName="text-xl font-bold text-sand-900"
          />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Trip-specific navigation */}
        {tripId ? (
          <>
            <div className="space-y-1">
              {tripNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => onTabChange?.(item.id)}
                  >
                    <Icon size={16} className="mr-2" />
                    {item.label}
                  </Button>
                );
              })}
            </div>

            {/* Timeline Subsections */}
            <Collapsible open={timelineExpanded} onOpenChange={setTimelineExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-start">
                  {timelineExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="ml-2">Timeline</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="ml-4 space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={() => setSecondaryPanel({ type: 'dates', title: 'Trip Dates' })}
                >
                  <CalendarDays size={14} className="mr-2" />
                  Trip Dates
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={() => setSecondaryPanel({ type: 'accommodations', title: 'Accommodations' })}
                >
                  <Home size={14} className="mr-2" />
                  Accommodations
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={() => setSecondaryPanel({ type: 'transportation', title: 'Transportation' })}
                >
                  <Plane size={14} className="mr-2" />
                  Transportation
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={() => setSecondaryPanel({ type: 'activities', title: 'Activities' })}
                >
                  <MapPin size={14} className="mr-2" />
                  Activities
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={() => setSecondaryPanel({ type: 'reservations', title: 'Reservations' })}
                >
                  <UtensilsCrossed size={14} className="mr-2" />
                  Reservations
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Back to Trips */}
            <div className="pt-4 border-t border-sand-200">
              <Link to="/my-trips">
                <Button variant="ghost" className="w-full justify-start">
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Trips
                </Button>
              </Link>
            </div>
          </>
        ) : (
          /* Regular navigation for non-trip pages */
          <div className="space-y-1">
            <Link to="/">
              <Button variant="ghost" className="w-full justify-start">
                <Home size={16} className="mr-2" />
                Home
              </Button>
            </Link>
            <Link to="/my-trips">
              <Button variant="ghost" className="w-full justify-start">
                <Calendar size={16} className="mr-2" />
                My Trips
              </Button>
            </Link>
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sand-200">
        <div className="space-y-2">
          <Link to="/profile">
            <Button variant="ghost" className="w-full justify-start">
              <User size={16} className="mr-2" />
              Profile
            </Button>
          </Link>
          <Link to="/settings">
            <Button variant="ghost" className="w-full justify-start">
              <Settings size={16} className="mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="md:hidden">
              <Calendar size={16} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>

        {/* Dialogs */}
        <AccommodationDialog 
          open={accommodationDialog.open}
          onOpenChange={(open) => setAccommodationDialog(prev => ({ ...prev, open }))}
          tripId={tripId}
          accommodation={accommodationDialog.mode === 'edit' ? accommodationDialog.data : undefined}
        />

        <TransportationDialog 
          open={transportationDialog.open}
          onOpenChange={(open) => setTransportationDialog(prev => ({ ...prev, open }))}
          tripId={tripId}
          transportation={transportationDialog.mode === 'edit' ? transportationDialog.data : undefined}
        />

        <ActivityDialogs 
          open={activityDialog.open}
          onOpenChange={(open) => setActivityDialog(prev => ({ ...prev, open }))}
          tripId={tripId}
          activity={activityDialog.mode === 'edit' ? activityDialog.data : undefined}
          tripArrivalDate={trip?.arrival_date}
          tripDepartureDate={trip?.departure_date}
        />

        <RestaurantReservationDialog 
          open={reservationDialog.open}
          onOpenChange={(open) => setReservationDialog(prev => ({ ...prev, open }))}
          tripId={tripId}
          reservation={reservationDialog.mode === 'edit' ? reservationDialog.data : undefined}
        />

        {trip && (
          <TripDateEditDialog 
            open={dateEditDialog}
            onOpenChange={setDateEditDialog}
            tripId={tripId}
            currentArrivalDate={trip.arrival_date}
            currentDepartureDate={trip.departure_date}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Main Sidebar */}
      <div className="fixed left-0 top-0 h-full w-[280px] bg-white border-r border-sand-200 z-30">
        {sidebarContent}
      </div>

      {/* Secondary Panel */}
      <SecondaryPanel 
        isOpen={!!secondaryPanel.type}
        title={secondaryPanel.title}
        onClose={() => setSecondaryPanel({ type: null, title: '' })}
      >
        {renderSecondaryPanelContent()}
      </SecondaryPanel>

      {/* Dialogs */}
      <AccommodationDialog 
        open={accommodationDialog.open}
        onOpenChange={(open) => setAccommodationDialog(prev => ({ ...prev, open }))}
        tripId={tripId}
        accommodation={accommodationDialog.mode === 'edit' ? accommodationDialog.data : undefined}
      />

      <TransportationDialog 
        open={transportationDialog.open}
        onOpenChange={(open) => setTransportationDialog(prev => ({ ...prev, open }))}
        tripId={tripId}
        transportation={transportationDialog.mode === 'edit' ? transportationDialog.data : undefined}
      />

      <ActivityDialogs 
        open={activityDialog.open}
        onOpenChange={(open) => setActivityDialog(prev => ({ ...prev, open }))}
        tripId={tripId}
        activity={activityDialog.mode === 'edit' ? activityDialog.data : undefined}
        tripArrivalDate={trip?.arrival_date}
        tripDepartureDate={trip?.departure_date}
      />

      <RestaurantReservationDialog 
        open={reservationDialog.open}
        onOpenChange={(open) => setReservationDialog(prev => ({ ...prev, open }))}
        tripId={tripId}
        reservation={reservationDialog.mode === 'edit' ? reservationDialog.data : undefined}
      />

      {trip && (
        <TripDateEditDialog 
          open={dateEditDialog}
          onOpenChange={setDateEditDialog}
          tripId={tripId}
          currentArrivalDate={trip.arrival_date}
          currentDepartureDate={trip.departure_date}
        />
      )}
    </>
  );
}