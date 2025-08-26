import { useAuth } from "@/contexts/AuthContext";
import { NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Menu, Calendar, CalendarDays, Building, Car, MapPin, UtensilsCrossed, 
  MessageCircle, Lightbulb, BarChart2, Package, Settings, 
  ArrowLeft, ChevronDown, ChevronRight, Users 
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import NavigationLogo from "../NavigationLogo";
import AccommodationDialog from "../trip/accommodation/AccommodationDialog";
import TransportationDialog from "../trip/transportation/TransportationDialog";
import TripDateEditDialog from "../trip/timeline/TripDateEditDialog";
import ActivityDialog from "../trip/day/activities/ActivityDialog";
import RestaurantReservationDialog from "../trip/dining/RestaurantReservationDialog";
import TravelerDialog from "../trip/travelers/TravelerDialog";
import { useSidebarState } from "@/hooks/useSidebarState";
import SecondaryPanel from "@/components/trip/SecondaryPanel";
import { supabase } from "@/integrations/supabase/client";


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
      { title: "Travelers", icon: Users, key: "travelers" },
    ]
  },
  { title: "AI Assistant", icon: MessageCircle, href: "chat" },
  { title: "Budget", icon: BarChart2, href: "budget" },
  { title: "Booking", icon: Package, href: "booking" },
];

interface SidebarProps {
  tripId: string | undefined;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ tripId, activeTab, onTabChange }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Initialize sidebar state and handlers for this trip
  const sidebar = useSidebarState(tripId);
  const {
    isOpen, setIsOpen,
    expandedItems, toggleExpanded,
    secondaryPanel, setSecondaryPanel,
    accommodationOpen, setAccommodationOpen,
    transportationOpen, setTransportationOpen,
    tripDatesOpen, setTripDatesOpen,
    activityOpen, setActivityOpen,
    reservationOpen, setReservationOpen,
    travelerOpen, setTravelerOpen,
    selectedAccommodation, setSelectedAccommodation,
    selectedTransportation, setSelectedTransportation,
    selectedActivity, setSelectedActivity,
    selectedReservation, setSelectedReservation,
    selectedTraveler, setSelectedTraveler,
    newActivity, setNewActivity,
    activityEdit, setActivityEdit,
    newArrival, setNewArrival,
    newDeparture, setNewDeparture,
    trip, tripLoading,
    accommodations, transportation, activities, reservations,
    handleBackToTrips,
    handleSubitemClick,
    handleAccommodationAdd, handleAccommodationEdit, handleAccommodationDelete,
    handleTransportationAdd, handleTransportationEdit, handleTransportationDelete,
    handleReservationAdd, handleReservationEdit, handleReservationDelete,
    handleActivityAdd, handleActivityEdit, handleActivityDelete,
    handleEditDates, handleSaveDates,
    handleAddActivity, handleEditActivity,
    handleTravelerAdd, handleTravelerEdit
  } = sidebar;
  const handleBackFromSecondary = () => {
    setSecondaryPanel(null);          // close the panel
    if (window.innerWidth < 768) {    // reopen the Sheet menu on mobile
      setIsOpen(true);
    }
  };

  // Primary sidebar navigation content
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
          {tripNavItems.map(item => (
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
                    {item.children.map(child => (
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
          <NavLink to="/profile">
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
          {/* Desktop */}
          <div className="hidden md:flex">
            <div className="fixed left-0 top-0 h-full w-[280px] bg-white border-r border-sand-200 z-30">
              {sidebarContent}
            </div>
          </div>

          {/* SecondaryPanel */}
          <SecondaryPanel
            activeKey={secondaryPanel}
            onClose={() => setSecondaryPanel(null)}
            onBack={handleBackFromSecondary}
            accommodations={accommodations}
            transportation={transportation}
            activities={activities}
            reservations={reservations}
            trip={trip ? { arrival_date: trip.arrival_date, departure_date: trip.departure_date, id: trip.trip_id } : null}
            onAccommodationAdd={handleAccommodationAdd}
            onAccommodationEdit={handleAccommodationEdit}
            onTransportationAdd={handleTransportationAdd}
            onTransportationEdit={handleTransportationEdit}
            onActivityAdd={handleActivityAdd}
            onActivityEdit={handleActivityEdit}
            onReservationAdd={handleReservationAdd}
            onReservationEdit={handleReservationEdit}
            onTravelerAdd={handleTravelerAdd}
            onTravelerEdit={handleTravelerEdit}
            onEditDates={handleEditDates}
          />

          {/* Mobile */}
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
            tripId={tripId || ""}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
              queryClient.invalidateQueries({ queryKey: ["accommodations", tripId] });
              setSelectedAccommodation(null);
            }}
          />

          <TransportationDialog
            open={transportationOpen}
            onOpenChange={setTransportationOpen}
            initialData={selectedTransportation}
            tripId={tripId || ""}
            onSuccess={(updated) => {
              // immediately patch local state
              handleTransportationEdit(updated);
              queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
              queryClient.invalidateQueries({ queryKey: ["transportation", tripId] });
              setSelectedTransportation(null);
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
        tripId={tripId || ""}
        title={selectedReservation ? "Edit Reservation" : "Add Reservation"}
        isSubmitting={false}
        tripArrivalDate={trip?.arrival_date}
        tripDepartureDate={trip?.departure_date}
        onDelete={selectedReservation ? async () => {
          await handleReservationDelete(selectedReservation.id);
          setReservationOpen(false);
          setSelectedReservation(null);
        } : undefined}
        onSubmit={async data => {
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
          } catch (err) {
            console.error('Failed to save reservation:', err);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save reservation' });
          }
        }}
      />
      <ActivityDialog
        isOpen={activityOpen || !!selectedActivity}
        onOpenChange={(open) => {
          if (!open) {
            setActivityOpen(false);
            setSelectedActivity(null);
            setActivityEdit({
              title: '',
              description: '',
              start_time: '',
              end_time: '',
              cost: '',
              currency: 'USD',
            });
          }
        }}
        activity={selectedActivity ? activityEdit : newActivity}
        onActivityChange={selectedActivity ? setActivityEdit : setNewActivity}
        onSubmit={(activity) => {
          if (selectedActivity) {
            handleEditActivity(selectedActivity, activity);
          } else {
            handleAddActivity(activity);
          }
        }}
        onDelete={(id) => {
          handleActivityDelete(id);
        }}
        eventId={tripId || ""}
        tripDates={trip ? { arrival_date: trip.arrival_date, departure_date: trip.departure_date } : undefined}
        tripId={tripId || ""}
        activityId={selectedActivity}
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
      
      <TravelerDialog
        open={travelerOpen}
        onOpenChange={(open) => {
          setTravelerOpen(open);
          if (!open) {
            setSelectedTraveler(null);
          }
        }}
        tripId={tripId}
        traveler={selectedTraveler}
      />
    </>
  );
}
