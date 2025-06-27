import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import ActivitiesList from "../trip/day/activities/ActivitiesList";
import RestaurantReservationDialog from "../trip/dining/RestaurantReservationDialog";
import { useTripQuery } from "@/hooks/useTripQuery";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActivityFormData } from "@/types/trip";
import { Currency } from '@/utils/currencyConstants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const tripNavItems = [
  { id: 'timeline', label: 'Timeline', icon: Calendar, href: 'timeline' },
  { id: 'ai-assistant', label: 'AI Assistant', icon: MessageCircle, href: 'ai-assistant' },
  { id: 'vision-board', label: 'Vision Board', icon: Lightbulb, href: 'vision-board' },
  { id: 'budget', label: 'Budget', icon: BarChart2, href: 'budget' },
  { id: 'packing-list', label: 'Packing List', icon: Package, href: 'packing-list' },
];

interface SidebarProps {
  tripId: string | undefined;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar = ({ tripId, activeTab, onTabChange }: SidebarProps) => {
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
  
  // Activity form data
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

  // Fetch trip data
  const { trip } = useTripQuery(tripId);

  // Fetch accommodations data
  const { data: accommodations = [] } = useQuery({
    queryKey: ['accommodations', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('accommodations')
        .select('*')
        .eq('trip_id', tripId)
        .order('stay_id');
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  // Fetch transportation data
  const { data: transportation = [] } = useQuery({
    queryKey: ['transportation', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('transportation')
        .select('*')
        .eq('trip_id', tripId)
        .order('departure_time');
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  // Fetch activities data
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
        .order('start_time');
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  // Fetch reservations data
  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('trip_id', tripId)
        .order('reservation_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  const handleBackToTrips = () => {
    navigate('/my-trips');
  };

  const toggleExpanded = (item: string) => {
    setExpandedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const timelineSubItems = [
    { 
      id: 'dates', 
      label: 'Trip Dates', 
      icon: CalendarDays,
      onClick: () => setSecondaryPanel('dates')
    },
    { 
      id: 'accommodations', 
      label: 'Accommodations', 
      icon: Building,
      onClick: () => setSecondaryPanel('accommodations')
    },
    { 
      id: 'transportation', 
      label: 'Transportation', 
      icon: Car,
      onClick: () => setSecondaryPanel('transportation')
    },
    { 
      id: 'activities', 
      label: 'Activities', 
      icon: MapPin,
      onClick: () => setSecondaryPanel('activities')
    },
    { 
      id: 'reservations', 
      label: 'Reservations', 
      icon: UtensilsCrossed,
      onClick: () => setSecondaryPanel('reservations')
    }
  ];

  const getSecondaryPanelContent = () => {
    switch (secondaryPanel) {
      case 'accommodations':
        return {
          title: 'Accommodations',
          content: (
            <div className="space-y-4">
              <Button 
                onClick={() => {
                  setSelectedAccommodation(null);
                  setAccommodationOpen(true);
                }}
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                Add Accommodation
              </Button>
              <div className="space-y-2">
                {accommodations.length === 0 ? (
                  <p className="text-sm text-sand-600 text-center py-4">No accommodations added yet</p>
                ) : (
                  accommodations.map((accommodation) => (
                    <div key={accommodation.stay_id} className="p-3 bg-sand-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{accommodation.hotel}</h4>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setSelectedAccommodation(accommodation);
                              setAccommodationOpen(true);
                            }}
                          >
                            <Edit size={12} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={async () => {
                              try {
                                const { error } = await supabase
                                  .from('accommodations')
                                  .delete()
                                  .eq('stay_id', accommodation.stay_id);
                                if (error) throw error;
                                queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] });
                              } catch (error) {
                                console.error('Error deleting accommodation:', error);
                              }
                            }}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-sand-600">
                        {accommodation.check_in_date} - {accommodation.check_out_date}
                      </p>
                      {accommodation.cost && (
                        <p className="text-xs text-sand-600">
                          {accommodation.currency || 'USD'} {accommodation.cost}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        };

      case 'transportation':
        return {
          title: 'Transportation',
          content: (
            <div className="space-y-4">
              <Button 
                onClick={() => {
                  setSelectedTransportation(null);
                  setTransportationOpen(true);
                }}
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                Add Transportation
              </Button>
              <div className="space-y-2">
                {transportation.length === 0 ? (
                  <p className="text-sm text-sand-600 text-center py-4">No transportation added yet</p>
                ) : (
                  transportation.map((transport) => (
                    <div key={transport.id} className="p-3 bg-sand-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{transport.type} - {transport.company}</h4>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setSelectedTransportation(transport);
                              setTransportationOpen(true);
                            }}
                          >
                            <Edit size={12} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={async () => {
                              try {
                                const { error } = await supabase
                                  .from('transportation')
                                  .delete()
                                  .eq('id', transport.id);
                                if (error) throw error;
                                queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
                              } catch (error) {
                                console.error('Error deleting transportation:', error);
                              }
                            }}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-sand-600">
                        {transport.from_location} → {transport.to_location}
                      </p>
                      <p className="text-xs text-sand-600">
                        {transport.departure_time} - {transport.arrival_time}
                      </p>
                      {transport.cost && (
                        <p className="text-xs text-sand-600">
                          {transport.currency || 'USD'} {transport.cost}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        };

      case 'activities':
        const formatTime = (timeStr?: string) => {
          if (!timeStr) return '';
          const [hours, minutes] = timeStr.split(':');
          const hour24 = parseInt(hours);
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          const ampm = hour24 >= 12 ? 'PM' : 'AM';
          return `${hour12}:${minutes} ${ampm}`;
        };

        return {
          title: 'Activities',
          content: (
            <ActivitiesList 
              activities={activities}
              onAddActivity={() => {
                setSelectedActivity(null);
                setActivityEdit({
                  title: '',
                  description: '',
                  date: trip?.arrival_date || '',
                  start_time: '',
                  end_time: '',
                  cost: '',
                  currency: 'USD' as Currency
                });
                setActivityOpen(true);
              }}
              onEditActivity={(activity) => {
                setSelectedActivity(activity);
                setActivityEdit({
                  title: activity.title || '',
                  description: activity.description || '',
                  date: trip?.arrival_date || '',
                  start_time: activity.start_time || '',
                  end_time: activity.end_time || '',
                  cost: activity.cost?.toString() || '',
                  currency: (activity.currency || 'USD') as Currency
                });
                setActivityOpen(true);
              }}
              formatTime={formatTime}
            />
          )
        };

      case 'reservations':
        const sortedReservations = reservations.sort((a, b) => {
          return new Date(b.reservation_time).getTime() - new Date(a.reservation_time).getTime();
        });

        return {
          title: 'Reservations',
          content: (
            <div className="space-y-4">
              <Button 
                onClick={() => {
                  setSelectedReservation(null);
                  setReservationOpen(true);
                }}
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                Add Reservation
              </Button>
              <div className="space-y-2">
                {sortedReservations.length === 0 ? (
                  <p className="text-sm text-sand-600 text-center py-4">No reservations added yet</p>
                ) : (
                  sortedReservations.map((reservation) => (
                    <div key={reservation.id} className="p-3 bg-sand-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{reservation.restaurant_name}</h4>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setSelectedReservation(reservation);
                              setReservationOpen(true);
                            }}
                          >
                            <Edit size={12} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={async () => {
                              try {
                                const { error } = await supabase
                                  .from('reservations')
                                  .delete()
                                  .eq('id', reservation.id);
                                if (error) throw error;
                                queryClient.invalidateQueries({ queryKey: ['reservations', tripId] });
                              } catch (error) {
                                console.error('Error deleting reservation:', error);
                              }
                            }}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-sand-600">
                        {new Date(reservation.reservation_time).toLocaleDateString()} - {reservation.number_of_people} people
                      </p>
                      {reservation.special_requests && (
                        <p className="text-xs text-sand-600">{reservation.special_requests}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        };

      case 'dates':
        const arrivalDate = trip?.arrival_date ? new Date(trip.arrival_date) : null;
        const departureDate = trip?.departure_date ? new Date(trip.departure_date) : null;
        
        const calculateDuration = () => {
          if (!arrivalDate || !departureDate) return null;
          const diffTime = Math.abs(departureDate.getTime() - arrivalDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const nights = diffDays - 1;
          return { days: diffDays, nights };
        };

        const duration = calculateDuration();

        return {
          title: 'Trip Dates',
          content: (
            <div className="space-y-4">
              <Button 
                onClick={() => setTripDatesOpen(true)}
                className="w-full"
              >
                <Edit size={16} className="mr-2" />
                Edit Dates
              </Button>
              <div className="space-y-3">
                <div className="p-3 bg-sand-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Arrival</h4>
                  <p className="text-sm text-sand-600">
                    {arrivalDate?.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) || 'Not set'}
                  </p>
                </div>
                <div className="p-3 bg-sand-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Departure</h4>
                  <p className="text-sm text-sand-600">
                    {departureDate?.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) || 'Not set'}
                  </p>
                </div>
                {duration && (
                  <div className="p-3 bg-sand-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Duration</h4>
                    <p className="text-sm text-sand-600">
                      {duration.days} days, {duration.nights} nights
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        };

      default:
        return null;
    }
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo or Back Button */}
      <div className="p-4 border-b border-sand-200">
        {tripId ? (
          <div className="space-y-4">
            <NavigationLogo />
            <Button
              variant="ghost"
              onClick={handleBackToTrips}
              className="w-full justify-start text-sand-600 hover:text-sand-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Trips
            </Button>
          </div>
        ) : (
          <NavigationLogo />
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2 py-4">
          {tripId ? (
            // Trip-specific navigation
            <>
              {tripNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isTimeline = item.id === 'timeline';
                const isExpanded = expandedItems.includes(item.id);

                return (
                  <div key={item.id}>
                    <div className="flex items-center">
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start",
                          isActive && "bg-sand-100 text-sand-900"
                        )}
                        onClick={() => {
                          if (isTimeline) {
                            toggleExpanded(item.id);
                          } else {
                            onTabChange(item.id);
                            onTabChange(item.href);
                          }
                        }}
                      >
                        <Icon className="mr-3 h-4 w-4" />
                        {item.label}
                        {isTimeline && (
                          <ChevronDown
                            className={cn(
                              "ml-auto h-4 w-4 transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        )}
                      </Button>
                    </div>

                    {/* Timeline Subitems */}
                    {isTimeline && (
                      <Collapsible open={isExpanded}>
                        <CollapsibleContent className="ml-4 mt-2 space-y-1">
                          {timelineSubItems.map((subItem) => {
                            const SubIcon = subItem.icon;
                            return (
                              <Button
                                key={subItem.id}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-sand-600 hover:text-sand-800"
                                onClick={subItem.onClick}
                              >
                                <SubIcon className="mr-3 h-3 w-3" />
                                {subItem.label}
                              </Button>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            // General navigation for non-trip pages
            <NavLink to="/my-trips">
              <Button variant="ghost" className="w-full justify-start">
                <Calendar className="mr-3 h-4 w-4" />
                My Trips
              </Button>
            </NavLink>
          )}
        </div>
      </ScrollArea>

      {/* User Section */}
      <div className="p-4 border-t border-sand-200">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sand-900 truncate">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </p>
          </div>
          <NavLink to="/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </NavLink>
        </div>
      </div>
    </div>
  );

  const content = getSecondaryPanelContent();

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        {/* Main Sidebar */}
        <div className="w-280 bg-white border-r border-sand-200 flex flex-col h-screen">
          {renderSidebarContent()}
        </div>

        {/* Secondary Panel */}
        {content && (
          <div className="w-320 bg-sand-50 border-r border-sand-200 flex flex-col h-screen">
            <div className="p-4 border-b border-sand-200 flex items-center justify-between">
              <h2 className="font-semibold text-sand-900">{content.title}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSecondaryPanel(null)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              {content.content}
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="fixed top-4 left-4 z-50 bg-white shadow-lg hover:bg-sand-50"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            {renderSidebarContent()}
          </SheetContent>
        </Sheet>
      </div>

      {/* Dialogs */}
      <AccommodationDialog
        open={accommodationOpen}
        onOpenChange={setAccommodationOpen}
        selectedAccommodation={selectedAccommodation}
        tripId={tripId}
      />

      <TransportationDialog
        open={transportationOpen}
        onOpenChange={setTransportationOpen}
        selectedTransportation={selectedTransportation}
        tripId={tripId}
      />

      <TripDateEditDialog
        open={tripDatesOpen}
        onOpenChange={setTripDatesOpen}
        trip={trip}
      />

      <ActivityDialogs
        isOpen={activityOpen}
        onOpenChange={setActivityOpen}
        selectedActivity={selectedActivity}
        activityEdit={activityEdit}
        setActivityEdit={setActivityEdit}
        tripId={tripId}
        tripDates={{
          arrival: trip?.arrival_date || '',
          departure: trip?.departure_date || ''
        }}
      />

      <RestaurantReservationDialog
        open={reservationOpen}
        onOpenChange={setReservationOpen}
        selectedReservation={selectedReservation}
        tripId={tripId}
      />
    </>
  );
};