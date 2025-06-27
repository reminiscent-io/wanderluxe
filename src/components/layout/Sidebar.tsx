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
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import NavigationLogo from "../NavigationLogo";
import AccommodationDialog from "../trip/accommodation/AccommodationDialog";
import TransportationDialog from "../trip/transportation/TransportationDialog";
import TripDateEditDialog from "../trip/timeline/TripDateEditDialog";
import AddActivityDialog from "../trip/day/activities/AddActivityDialog";
import EditActivityDialog from "../trip/day/activities/EditActivityDialog";
import RestaurantReservationDialog from "../trip/dining/RestaurantReservationDialog";
import { useTripQuery } from "@/hooks/useTripQuery";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

  // Fetch activities data
  const { data: activities = [] } = useQuery({
    queryKey: ['activities', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('day_activities')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: false })
        .order('time', { ascending: false });
      
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
                              onClick={() => {
                                // Handle delete - could add confirmation dialog
                                console.log('Delete accommodation:', accommodation.stay_id);
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
        case 'transportation':
          return {
            title: 'Transportation',
            content: (
              <div className="space-y-4">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => {
                    setSelectedTransportation(null); // Clear for adding new
                    setIsTransportationDialogOpen(true);
                  }}
                >
                  <Plus size={16} className="mr-2" />
                  Add Transportation
                </Button>
                <div className="space-y-2">
                  <div className="p-3 bg-sand-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Flight to Rome</h4>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            // Set dummy transportation data for editing
                            setSelectedTransportation({
                              id: '550e8400-e29b-41d4-a716-446655440000',
                              type: 'flight',
                              departure_location: 'New York JFK',
                              arrival_location: 'Rome FCO',
                              start_date: '2025-02-12',
                              start_time: '08:00',
                              end_date: '2025-02-12',
                              end_time: '20:00',
                              cost: 850
                            });
                            setIsTransportationDialogOpen(true);
                          }}
                        >
                          <Edit size={12} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            console.log('Delete transportation');
                          }}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-sand-600">Departure: Feb 12, 8:00 AM</p>
                  </div>
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