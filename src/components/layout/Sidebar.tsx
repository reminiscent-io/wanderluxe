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
  { 
    id: "timeline", 
    label: "Timeline", 
    icon: Calendar,
    subItems: [
      { id: "trip-dates", label: "Trip Dates", icon: CalendarDays },
      { id: "accommodations", label: "Accommodations", icon: Building },
      { id: "transportation", label: "Transportation", icon: Car },
      { id: "activities", label: "Activities", icon: MapPin },
      { id: "reservations", label: "Reservations", icon: UtensilsCrossed },
    ]
  },
  { id: "chat", label: "AI Assistant", icon: MessageCircle },
  { id: "vision-board", label: "Vision Board", icon: Lightbulb },
  { id: "budget", label: "Budget", icon: BarChart2 },
  { id: "booking", label: "Booking", icon: Package },
];

// Secondary Panel Component
const SecondaryPanel = ({ isOpen, title, children, onClose }: SecondaryPanelProps) => {
  if (!isOpen) return null;

  return (
    <aside className="fixed left-[280px] top-0 h-screen w-[320px] bg-white shadow-lg ring-1 ring-sand-200/40 z-[200] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-sand-200">
        <h3 className="text-lg font-medium text-earth-800">{title}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <ChevronRight size={16} className="rotate-180" />
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-73px)]">
        <div className="p-4">
          {children}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default function Sidebar({ tripId, activeTab, onTabChange }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [secondaryPanel, setSecondaryPanel] = useState<{
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
  }>({ isOpen: false, title: '', content: null });
  
  // Fetch trip data including accommodations
  const { trip } = useTripQuery(tripId);
  const queryClient = useQueryClient();

  // Fetch transportation data
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

  // Fetch activities data with trip day dates
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
    enabled: !!tripId,
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
    enabled: !!tripId,
  });
  
  // Success callback for accommodation changes
  const handleAccommodationSuccess = () => {
    // Invalidate trip query to refresh accommodations data
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    setSecondaryPanel(prev => ({ ...prev, isOpen: false }));
  };

  // Success callback for activity changes
  const handleActivitySuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
  };

  // Success callback for reservation changes
  const handleReservationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['reservations', tripId] });
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
  };
  
  // Dialog states for functional buttons
  const [isAccommodationDialogOpen, setIsAccommodationDialogOpen] = useState(false);
  const [isTransportationDialogOpen, setIsTransportationDialogOpen] = useState(false);
  const [isEditDatesDialogOpen, setIsEditDatesDialogOpen] = useState(false);
  const [isAddActivityDialogOpen, setIsAddActivityDialogOpen] = useState(false);
  const [isEditActivityDialogOpen, setIsEditActivityDialogOpen] = useState(false);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  
  // Selected items for editing
  const [selectedAccommodation, setSelectedAccommodation] = useState<any>(null);
  const [selectedTransportation, setSelectedTransportation] = useState<any>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  
  // Activity form state
  const [newActivity, setNewActivity] = useState<ActivityFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD' as Currency
  });
  const [activityEdit, setActivityEdit] = useState<ActivityFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD' as Currency
  });
  
  // Trip date editing state
  const [newArrival, setNewArrival] = useState('');
  const [newDeparture, setNewDeparture] = useState('');

  const handleTabClick = (tabId: string) => {
    // Handle expanding/collapsing items with subitems
    const item = tripNavItems.find(item => item.id === tabId);
    if (item?.subItems) {
      const isExpanded = expandedItems.includes(tabId);
      if (isExpanded) {
        setExpandedItems(expandedItems.filter(id => id !== tabId));
      } else {
        setExpandedItems([...expandedItems, tabId]);
      }
    }
    
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  const handleSubItemClick = (subItemId: string) => {
    // Show secondary panel with relevant content for the subitem
    const getSecondaryContent = (id: string) => {
      switch (id) {
        case 'accommodations':
          const accommodations = trip?.accommodations || [];
          return {
            title: 'Accommodations',
            content: (
              <div className="space-y-4">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => {
                    setSelectedAccommodation(null); // Clear for adding new
                    setIsAccommodationDialogOpen(true);
                  }}
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
                                // Set real accommodation data for editing
                                setSelectedAccommodation(accommodation);
                                setIsAccommodationDialogOpen(true);
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
                                  handleAccommodationSuccess();
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
                          {accommodation.hotel_checkin_date} - {accommodation.hotel_checkout_date}
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
        case 'activities':
          // Group activities by date using trip_days data
          const groupedActivities = activities.reduce((groups, activity) => {
            const activityDate = activity.trip_days?.date || trip?.arrival_date || new Date().toISOString().split('T')[0];
            if (!groups[activityDate]) {
              groups[activityDate] = [];
            }
            groups[activityDate].push(activity);
            return groups;
          }, {} as Record<string, typeof activities>);

          // Sort dates and activities within each date
          const sortedDateGroups = Object.entries(groupedActivities)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([date, dateActivities]) => ({
              date,
              activities: dateActivities.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
            }));

          const formatTime = (timeStr: string) => {
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
              <div className="space-y-4">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => {
                    setSelectedActivity(null);
                    setIsAddActivityDialogOpen(true);
                  }}
                >
                  <Plus size={16} className="mr-2" />
                  Add Activity
                </Button>
                <div className="space-y-2">
                  {sortedDateGroups.length === 0 ? (
                    <p className="text-sm text-sand-600 text-center py-4">No activities added yet</p>
                  ) : (
                    sortedDateGroups.map(({ date, activities: dateActivities }) => (
                      <div key={date} className="mb-4">
                        <div className="text-xs font-medium text-sand-700 mb-2 px-1">
                          {new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
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
                                setSelectedActivity(activity);
                                setActivityEdit({
                                  title: activity.title || '',
                                  description: activity.description || '',
                                  date: trip?.arrival_date,
                                  start_time: activity.start_time || '',
                                  end_time: activity.end_time || '',
                                  cost: activity.cost?.toString() || '',
                                  currency: (activity.currency || 'USD') as Currency
                                });
                                setIsEditActivityDialogOpen(true);
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
                                    .from('day_activities')
                                    .delete()
                                    .eq('id', activity.id);
                                  if (error) throw error;
                                  queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
                                } catch (error) {
                                  console.error('Error deleting activity:', error);
                                }
                              }}
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-sand-600">
                          {activity.start_time || activity.end_time ? (
                            <>
                              {activity.start_time && (() => {
                                const [hours, minutes] = activity.start_time.split(':');
                                const hour24 = parseInt(hours);
                                const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                                const ampm = hour24 >= 12 ? 'PM' : 'AM';
                                return `${hour12}:${minutes} ${ampm}`;
                              })()}
                              {activity.start_time && activity.end_time && ' - '}
                              {activity.end_time && (() => {
                                const [hours, minutes] = activity.end_time.split(':');
                                const hour24 = parseInt(hours);
                                const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                                const ampm = hour24 >= 12 ? 'PM' : 'AM';
                                return `${hour12}:${minutes} ${ampm}`;
                              })()}
                            </>
                          ) : 'No time set'}
                        </p>
                        {activity.cost && (
                          <p className="text-xs text-sand-600">
                            {activity.currency || 'USD'} {activity.cost}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          };
        case 'reservations':
          const sortedReservations = reservations.sort((a, b) => {
            // Sort by reservation_time descending
            return new Date(b.reservation_time).getTime() - new Date(a.reservation_time).getTime();
          });
          
          return {
            title: 'Reservations',
            content: (
              <div className="space-y-4">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => {
                    setSelectedReservation(null);
                    setIsReservationDialogOpen(true);
                  }}
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
                                setIsReservationDialogOpen(true);
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
                          {new Date(reservation.reservation_time).toLocaleDateString()} at {new Date(reservation.reservation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-sand-600">
                          {reservation.number_of_people} people
                        </p>
                        {reservation.cost && (
                          <p className="text-xs text-sand-600">
                            {reservation.currency || 'USD'} {reservation.cost}
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
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => {
                    setSelectedTransportation(null);
                    setIsTransportationDialogOpen(true);
                  }}
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
                          <h4 className="font-medium text-sm">
                            {transport.type.charAt(0).toUpperCase() + transport.type.slice(1)}
                            {transport.provider && ` - ${transport.provider}`}
                          </h4>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setSelectedTransportation(transport);
                                setIsTransportationDialogOpen(true);
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
                        {transport.departure_location && transport.arrival_location && (
                          <p className="text-xs text-sand-600 mb-1">
                            {transport.departure_location} → {transport.arrival_location}
                          </p>
                        )}
                        <p className="text-xs text-sand-600">
                          {new Date(transport.start_date).toLocaleDateString()}
                          {transport.start_time && ` at ${transport.start_time}`}
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
        case 'trip-dates':
          const arrivalDate = trip?.arrival_date;
          const departureDate = trip?.departure_date;
          const calculateDuration = () => {
            if (arrivalDate && departureDate) {
              const start = new Date(arrivalDate);
              const end = new Date(departureDate);
              const diffTime = Math.abs(end.getTime() - start.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const nights = diffDays - 1;
              return `${diffDays} days, ${nights} nights`;
            }
            return 'No dates set';
          };
          
          return {
            title: 'Trip Dates',
            content: (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="p-3 bg-sand-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Arrival</h4>
                    <p className="text-sm text-sand-700">
                      {arrivalDate ? new Date(arrivalDate).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      }) : 'Not set'}
                    </p>
                  </div>
                  <div className="p-3 bg-sand-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Departure</h4>
                    <p className="text-sm text-sand-700">
                      {departureDate ? new Date(departureDate).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      }) : 'Not set'}
                    </p>
                  </div>
                  <div className="p-3 bg-sand-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Duration</h4>
                    <p className="text-sm text-sand-700">{calculateDuration()}</p>
                  </div>
                </div>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => {
                    // Initialize date values from current trip dates
                    setNewArrival(arrivalDate || '');
                    setNewDeparture(departureDate || '');
                    setIsEditDatesDialogOpen(true);
                  }}
                >
                  <Edit size={16} className="mr-2" />
                  Edit Dates
                </Button>
              </div>
            )
          };
        default:
          return { title: 'Details', content: <div>No content available</div> };
      }
    };

    const content = getSecondaryContent(subItemId);
    setSecondaryPanel({
      isOpen: true,
      title: content.title,
      content: content.content
    });

    // Keep the main tab on 'timeline' instead of switching to the subitem
    if (onTabChange) {
      onTabChange('timeline');
    }
  };

  const handleBackToTrips = () => {
    navigate('/my-trips');
  };

  const content = (
    <ScrollArea className="h-full">
      <div className="p-4">
        {/* Logo at the top when in trip context */}
        {tripId && (
          <>
            <div className="flex items-center justify-center mb-6">
              <NavigationLogo />
            </div>
            <Separator className="mb-4" />
          </>
        )}
        
        <nav className="flex flex-col gap-1">
          {/* Back to trips button when in trip context */}
          {tripId && (
            <>
              <Button
                variant="ghost"
                onClick={handleBackToTrips}
                className="flex items-center gap-3 justify-start px-3 py-2 text-sm font-medium text-sand-600 hover:bg-sand-50 w-full"
              >
                <ArrowLeft size={18} className="shrink-0" />
                <span>Back to Trips</span>
              </Button>
              <Separator className="my-2" />
            </>
          )}

        {/* Trip navigation items when in trip context */}
        {tripId ? (
          tripNavItems.map((item) => {
            const IconComponent = item.icon;
            const isExpanded = expandedItems.includes(item.id);
            const hasSubItems = item.subItems && item.subItems.length > 0;
            
            return (
              <div key={item.id}>
                {hasSubItems ? (
                  <Collapsible open={isExpanded} onOpenChange={() => handleTabClick(item.id)}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left",
                          activeTab === item.id
                            ? "bg-sand-100 text-earth-600"
                            : "text-sand-600 hover:bg-sand-50"
                        )}
                      >
                        <IconComponent size={18} className="shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {isExpanded ? (
                          <ChevronDown size={16} className="shrink-0" />
                        ) : (
                          <ChevronRight size={16} className="shrink-0" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-6 space-y-1 mt-1">
                      {item.subItems?.map((subItem) => {
                        const SubIconComponent = subItem.icon;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => handleSubItemClick(subItem.id)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left",
                              activeTab === subItem.id
                                ? "bg-sand-100 text-earth-600"
                                : "text-sand-600 hover:bg-sand-50"
                            )}
                          >
                            <SubIconComponent size={16} className="shrink-0" />
                            <span>{subItem.label}</span>
                          </button>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <button
                    onClick={() => handleTabClick(item.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left",
                      activeTab === item.id
                        ? "bg-sand-100 text-earth-600"
                        : "text-sand-600 hover:bg-sand-50"
                    )}
                  >
                    <IconComponent size={18} className="shrink-0" />
                    <span>{item.label}</span>
                  </button>
                )}
              </div>
            );
          })
        ) : (
          /* Global navigation items when not in trip context */
          <>
            <NavLink
              to="/my-trips"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sand-100 text-earth-600"
                    : "text-sand-600 hover:bg-sand-50"
                )
              }
            >
              <Package size={18} className="shrink-0" />
              <span>My Trips</span>
            </NavLink>
          </>
        )}
        
        <Separator className="my-2" />
        
        {/* Profile shortcut */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sand-100 text-earth-600"
                : "text-sand-600 hover:bg-sand-50"
            )
          }
        >
          <Avatar className="w-5 h-5">
            <AvatarImage 
              src={user?.user_metadata?.avatar_url} 
              alt={user?.user_metadata?.name || "Profile"} 
            />
            <AvatarFallback className="w-5 h-5 text-xs">
              <User size={12} />
            </AvatarFallback>
          </Avatar>
          <span>{user?.user_metadata?.name || "Profile"}</span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sand-100 text-earth-600"
                : "text-sand-600 hover:bg-sand-50"
            )
          }
        >
          <Settings size={18} className="shrink-0" />
          <span>Settings</span>
        </NavLink>
      </nav>
      </div>
    </ScrollArea>
  );

  const closeSecondaryPanel = () => {
    setSecondaryPanel({ isOpen: false, title: '', content: null });
  };

  // For trips view, show permanent sidebar on desktop and mobile sheet
  if (tripId) {
    return (
      <>
        {/* Mobile trigger for trips */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open sidebar">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="p-0 w-[280px]"
          >
            {content}
          </SheetContent>
        </Sheet>

        {/* Desktop permanent sidebar for trips */}
        <aside className="hidden md:block fixed left-0 top-0 h-screen w-[280px] bg-white shadow-lg ring-1 ring-sand-200/40 z-[201]">
          {content}
        </aside>

        {/* Secondary Panel */}
        <SecondaryPanel
          isOpen={secondaryPanel.isOpen}
          title={secondaryPanel.title}
          onClose={closeSecondaryPanel}
        >
          {secondaryPanel.content}
        </SecondaryPanel>

        {/* Functional Dialogs */}
        {tripId && (
          <>
            <AccommodationDialog
              tripId={tripId}
              open={isAccommodationDialogOpen}
              onOpenChange={(open) => {
                setIsAccommodationDialogOpen(open);
                if (!open) setSelectedAccommodation(null);
              }}
              initialData={selectedAccommodation}
              onSuccess={() => {
                handleAccommodationSuccess();
                setSelectedAccommodation(null);
              }}
            />
            
            <TransportationDialog
              tripId={tripId}
              open={isTransportationDialogOpen}
              onOpenChange={(open) => {
                setIsTransportationDialogOpen(open);
                if (!open) setSelectedTransportation(null);
              }}
              initialData={selectedTransportation}
              onSuccess={() => {
                setIsTransportationDialogOpen(false);
                setSelectedTransportation(null);
              }}
            />

            {/* Trip Date Edit Dialog */}
            <TripDateEditDialog
              isOpen={isEditDatesDialogOpen}
              onOpenChange={setIsEditDatesDialogOpen}
              arrivalDate={newArrival}
              departureDate={newDeparture}
              onArrivalChange={setNewArrival}
              onDepartureChange={setNewDeparture}
              onSave={() => {
                // Placeholder save function - would normally save to database
                console.log('Saving trip dates:', newArrival, newDeparture);
                setIsEditDatesDialogOpen(false);
              }}
            />

            {/* Activity dialogs */}
            <ActivityDialogs
              isAddingActivity={isAddActivityDialogOpen}
              setIsAddingActivity={setIsAddActivityDialogOpen}
              editingActivity={selectedActivity?.id || null}
              setEditingActivity={(id) => {
                if (!id) {
                  setSelectedActivity(null);
                  setIsEditActivityDialogOpen(false);
                } else {
                  const activity = activities.find(a => a.id === id);
                  if (activity) {
                    setSelectedActivity(activity);
                    setActivityEdit({
                      title: activity.title || '',
                      description: activity.description || '',
                      start_time: activity.start_time || '',
                      end_time: activity.end_time || '',
                      cost: activity.cost?.toString() || '',
                      currency: (activity.currency || 'USD') as Currency
                    });
                    setIsEditActivityDialogOpen(true);
                  }
                }
              }}
              newActivity={newActivity}
              setNewActivity={setNewActivity}
              activityEdit={activityEdit}
              setActivityEdit={setActivityEdit}
              tripDates={trip ? { 
                arrival_date: trip.arrival_date, 
                departure_date: trip.departure_date 
              } : undefined}
              onAddActivity={async (activity) => {
                // Handle activity submission logic here
                try {
                  // Get first day of trip for default day_id
                  const { data: tripDays } = await supabase
                    .from('trip_days')
                    .select('day_id')
                    .eq('trip_id', tripId)
                    .order('date')
                    .limit(1);
                  
                  if (!tripDays || tripDays.length === 0) throw new Error('No trip days available');
                  const firstDay = tripDays[0];
                  
                  const activityData = {
                    title: activity.title,
                    description: activity.description || null,
                    start_time: activity.start_time || null,
                    end_time: activity.end_time || null,
                    cost: activity.cost ? parseFloat(activity.cost) : null,
                    currency: activity.currency,
                    day_id: firstDay.day_id,
                    trip_id: tripId,
                    order_index: 0,
                    is_paid: false
                  };
                  
                  const { error } = await supabase
                    .from('day_activities')
                    .insert([activityData]);
                  if (error) throw error;
                  handleActivitySuccess();
                  setIsAddActivityDialogOpen(false);
                } catch (error) {
                  console.error('Error adding activity:', error);
                  throw error;
                }
              }}
              onEditActivity={async (id, updatedActivity) => {
                // Handle activity update logic here
                try {
                  const activityUpdateData = {
                    title: updatedActivity.title,
                    description: updatedActivity.description || null,
                    start_time: updatedActivity.start_time || null,
                    end_time: updatedActivity.end_time || null,
                    cost: updatedActivity.cost ? parseFloat(updatedActivity.cost) : null,
                    currency: updatedActivity.currency
                  };
                  
                  const { error } = await supabase
                    .from('day_activities')
                    .update(activityUpdateData)
                    .eq('id', id);
                  if (error) throw error;
                  handleActivitySuccess();
                  setIsEditActivityDialogOpen(false);
                  setSelectedActivity(null);
                } catch (error) {
                  console.error('Error updating activity:', error);
                  throw error;
                }
              }}
              onDeleteActivity={async (id) => {
                // Handle activity delete logic here
                try {
                  const { error } = await supabase
                    .from('day_activities')
                    .delete()
                    .eq('id', id);
                  if (error) throw error;
                  handleActivitySuccess();
                  setIsEditActivityDialogOpen(false);
                  setSelectedActivity(null);
                } catch (error) {
                  console.error('Error deleting activity:', error);
                  throw error;
                }
              }}
              eventId={tripId || ''}
            />

            {/* Reservation dialog */}
            <RestaurantReservationDialog
              isOpen={isReservationDialogOpen}
              onOpenChange={(open) => {
                setIsReservationDialogOpen(open);
                if (!open) setSelectedReservation(null);
              }}
              onSubmit={async (data) => {
                // Handle reservation submission
                try {
                  if (selectedReservation) {
                    // Update existing reservation
                    const { error } = await supabase
                      .from('reservations')
                      .update(data)
                      .eq('id', selectedReservation.id);
                    if (error) throw error;
                  } else {
                    // Create new reservation
                    const { error } = await supabase
                      .from('reservations')
                      .insert([{ ...data, trip_id: tripId }]);
                    if (error) throw error;
                  }
                  handleReservationSuccess();
                  setIsReservationDialogOpen(false);
                  setSelectedReservation(null);
                } catch (error) {
                  console.error('Error saving reservation:', error);
                  throw error;
                }
              }}
              isSubmitting={false}
              editingReservation={selectedReservation}
              title={selectedReservation ? "Edit Reservation" : "Add Reservation"}
              tripId={tripId}
            />
          </>
        )}
      </>
    );
  }

  // For non-trip views, keep the original collapsible behavior
  const [open, setOpen] = useState<boolean>(
    () => JSON.parse(localStorage.getItem("sidebar:isOpen") ?? "true")
  );

  useEffect(() => {
    localStorage.setItem("sidebar:isOpen", String(open));
  }, [open]);

  return (
    <>
      {/* Mobile trigger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" aria-label="Open sidebar">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 w-[280px]"
        >
          {content}
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar toggle button - when not in trips */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className={cn(
          "hidden md:flex fixed top-4 z-[202] h-8 w-8 bg-white shadow-md ring-1 ring-sand-200/40 hover:bg-sand-50 transition-all",
          open ? "left-[260px]" : "left-4"
        )}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Desktop sidebar - when not in trips */}
      <aside
        className={cn(
          "hidden md:block fixed left-0 top-0 h-screen w-[280px] bg-white shadow-lg ring-1 ring-sand-200/40 transition-transform z-[201]",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {content}
      </aside>
    </>
  );
}