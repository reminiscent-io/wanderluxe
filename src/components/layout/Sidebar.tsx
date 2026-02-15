import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Menu, Calendar, CalendarDays, Building, Car, MapPin, UtensilsCrossed,
  Sparkles, BarChart2, Package, Settings, ArrowLeft, Users, Download, Link2, ShieldCheck, Trash2
} from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import AccommodationDialog from "../trip/accommodation/AccommodationDialog";
import TransportationDialog from "../trip/transportation/TransportationDialog";
import TripDateEditDialog from "../trip/timeline/TripDateEditDialog";
import ActivityDialog from "../trip/day/activities/ActivityDialog";
import RestaurantReservationDialog from "../trip/dining/RestaurantReservationDialog";
import TravelerDialog from "../trip/travelers/TravelerDialog";
import InviteLinkDialog from "../trip/travelers/InviteLinkDialog";
import { useSidebarState } from "@/hooks/useSidebarState";
import SecondaryPanel from "@/components/trip/SecondaryPanel";
import ShareTripDialog from "@/components/trip/ShareTripDialog";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useInviteLinks } from "@/hooks/useInviteLinks";

export interface SidebarHandle {
  openAccommodationDialog: () => void;
  openTransportationDialog: () => void;
  openActivityDialog: () => void;
  openReservationDialog: () => void;
  openSidebarSheet: () => void;
  openTravelerDialog: () => void;
  openTravelersPanel: () => void;
  openInviteLinkDialog: () => void;
}

export const tripNavItems = [
  { title: "Timeline", icon: Calendar, href: "timeline" },
  { title: "Budget", icon: BarChart2, href: "budget" },
  { title: "Booking", icon: Package, href: "booking" },
];

export const timelineManagementItems = {
  primary: [
    { title: "Trip Dates", icon: CalendarDays, key: "dates" },
    { title: "Travelers", icon: Users, key: "travelers" },
  ],
  secondary: [
    { title: "Accommodations", icon: Building, key: "accommodations" },
    { title: "Transportation", icon: Car, key: "transportation" },
    { title: "Activities", icon: MapPin, key: "activities" },
    { title: "Reservations", icon: UtensilsCrossed, key: "reservations" },
  ]
};

interface SidebarProps {
  tripId: string | undefined;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar = React.forwardRef<SidebarHandle, SidebarProps>(({ tripId }, ref) => {
  const { user, subscriptionTier, avatarUrl, fullName } = useAuth();
  const queryClient = useQueryClient();
  const sidebar = useSidebarState(tripId);
  const { canInstall, handleInstall } = usePWAInstall();
  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
  const { isAdmin } = useIsAdmin();

  // Listen for custom event from Navigation hamburger menu
  React.useEffect(() => {
    const handleOpenSidebar = () => {
      sidebar.setIsOpen(true);
    };
    window.addEventListener('wanderluxe:open-sidebar', handleOpenSidebar);
    return () => {
      window.removeEventListener('wanderluxe:open-sidebar', handleOpenSidebar);
    };
  }, [sidebar]);

  // Expose methods to parent via ref
  React.useImperativeHandle(ref, () => ({
    openAccommodationDialog: () => sidebar.setAccommodationOpen(true),
    openTransportationDialog: () => sidebar.setTransportationOpen(true),
    openActivityDialog: () => sidebar.setActivityOpen(true),
    openReservationDialog: () => sidebar.setReservationOpen(true),
    openSidebarSheet: () => sidebar.setIsOpen(true),
    openTravelerDialog: () => sidebar.setTravelerOpen(true),
    openTravelersPanel: () => sidebar.handleSubitemClick('travelers'),
    openInviteLinkDialog: () => sidebar.setInviteLinkOpen(true),
  }));

  const {
    isOpen, setIsOpen,
    secondaryPanel, setSecondaryPanel,
    accommodationOpen, setAccommodationOpen,
    transportationOpen, setTransportationOpen,
    tripDatesOpen, setTripDatesOpen,
    activityOpen, setActivityOpen,
    reservationOpen, setReservationOpen,
    travelerOpen, setTravelerOpen,
    inviteLinkOpen, setInviteLinkOpen,
    selectedAccommodation, setSelectedAccommodation,
    selectedTransportation, setSelectedTransportation,
    selectedActivity, setSelectedActivity,
    selectedReservation, setSelectedReservation,
    selectedTraveler, setSelectedTraveler,
    newActivity, setNewActivity,
    activityEdit, setActivityEdit,
    newArrival, setNewArrival,
    newDeparture, setNewDeparture,
    trip, accommodations, transportation, activities, reservations,
    handleBackToTrips,
    handleSubitemClick,
    handleAccommodationAdd, handleAccommodationEdit,
    handleTransportationAdd, handleTransportationEdit,
    handleReservationAdd, handleReservationEdit, handleReservationDelete,
    handleActivityAdd, handleActivityEdit, handleActivityDelete,
    handleEditDates, handleSaveDates,
    handleTravelerAdd, handleTravelerEdit
  } = sidebar;

  const isOwner = !!trip && !!user && trip.user_id === user.id;

  const { createLink, creating } = useInviteLinks(tripId || "");

  const handleDeleteTrip = async () => {
    if (!tripId) return;
    try {
      const { error: sharesError } = await supabase
        .from('trip_shares')
        .delete()
        .eq('trip_id', tripId);
      if (sharesError) {
        console.error('Error removing trip shares:', sharesError);
      }

      const { error } = await supabase
        .from('trips')
        .update({ hidden: true })
        .eq('trip_id', tripId);
      if (error) throw error;

      toast({ title: 'Success', description: 'Trip deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['my-trips'] });
      queryClient.invalidateQueries({ queryKey: ['shared-trips'] });
      handleBackToTrips();
    } catch (error) {
      console.error('Failed to delete trip:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete trip' });
    }
  };

  const handleBackFromSecondary = () => {
    setSecondaryPanel(null);
    if (window.innerWidth < 768) setIsOpen(true);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Removed the duplicate logo/header block to avoid double-branding */}
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
          
          <Button
            size="sm"
            className="w-full mb-4 bg-earth-500 text-white hover:bg-earth-600 shadow-sm"
            onClick={() => setInviteLinkOpen(true)}
          >
            <Link2 className="mr-2 h-4 w-4" />
            Generate Invite Link
          </Button>

          {tripNavItems.map(item => (
            <div key={item.title}>
              <NavLink
                to={`/trip/${tripId}/${item.href}`}
                onClick={() => {
                  if (window.innerWidth < 768) setIsOpen(false);
                }}
                className={({ isActive }) => cn(
                  "w-full justify-start text-left flex items-center px-4 py-2 rounded-md transition-colors",
                  isActive
                    ? "bg-earth-100 text-earth-700"
                    : "text-sand-600 hover:text-earth-600 hover:bg-sand-50"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </NavLink>

              {item.title === "Booking" && tripId && (
                <Button
                  size="sm"
                  onClick={() => setIsShareDialogOpen(true)}
                  className="mt-2 mb-4 w-full bg-earth-500 text-white hover:bg-earth-600 shadow-sm"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Generate Invite Link
                </Button>
              )}
              {item.title === "Timeline" && (
                <div className="mt-2 mb-4">
                  <div className="space-y-1 mb-3">
                    {timelineManagementItems.primary.map(child => (
                      <Button
                        key={child.key}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSubitemClick(child.key)}
                        className={cn(
                          "w-full justify-start pl-6 h-8 text-xs",
                          secondaryPanel === child.key
                            ? "bg-earth-50 text-earth-600"
                            : "text-sand-500 hover:text-earth-500 hover:bg-sand-50"
                        )}
                      >
                        <child.icon className="mr-2 h-3 w-3" />
                        {child.title}
                      </Button>
                    ))}
                  </div>
                  <div className="pl-6 pr-4 my-2">
                    <Separator />
                  </div>
                  <div className="space-y-1">
                    {timelineManagementItems.secondary.map(child => (
                      <Button
                        key={child.key}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSubitemClick(child.key)}
                        className={cn(
                          "w-full justify-start pl-6 h-8 text-xs",
                          secondaryPanel === child.key
                            ? "bg-earth-50 text-earth-600"
                            : "text-sand-500 hover:text-earth-500 hover:bg-sand-50"
                        )}
                      >
                        <child.icon className="mr-2 h-3 w-3" />
                        {child.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-sand-200 space-y-3">
        {/* Mobile-only Admin Portal - Shows only on mobile for admins */}
        {isAdmin && (
          <div className="md:hidden">
            <NavLink to="/admin" onClick={() => setIsOpen(false)}>
              <Button
                className="w-full justify-start text-sand-600 hover:text-earth-600 hover:bg-sand-50"
                variant="ghost"
                size="sm"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Admin Portal
              </Button>
            </NavLink>
          </div>
        )}

        {/* Mobile-only PWA Install Button - Shows only on mobile when in trip */}
        {tripId && canInstall && (
          <div className="md:hidden">
            <Button
              onClick={handleInstall}
              className="w-full justify-start bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
              variant="outline"
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Add to Home Screen
            </Button>
          </div>
        )}

        {/* Delete Trip - only visible to trip owner */}
        {isOwner && tripId && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sand-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Trip
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the trip from your list and revoke access for anyone it was shared with. You can restore it later from hidden trips.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteTrip}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl || user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-earth-100 text-earth-600">
              {fullName
                ? fullName.split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase()
                : user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-sand-700 truncate">
                {fullName || user?.user_metadata?.full_name || user?.email}
              </p>
              <span className={cn(
                "px-1.5 py-0.5 text-[10px] font-medium rounded-full shrink-0",
                subscriptionTier === 'pro'
                  ? "bg-amber-100 text-amber-700"
                  : "bg-sand-100 text-sand-500"
              )}>
                {subscriptionTier === 'pro' ? 'Pro' : 'Free'}
              </span>
            </div>
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
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <div
          className="fixed left-0 w-[280px] bg-white border-r border-sand-200 z-30"
          style={{
            top: "calc(var(--app-nav-h, 64px) + env(safe-area-inset-top, 0px))",
            height: "calc(calc(var(--app-height, 1vh) * 100) - var(--app-nav-h, 64px) - env(safe-area-inset-top, 0px))",
          }}
        >
          {sidebarContent}
        </div>
      </div>

      {/* Secondary Panel */}
      <SecondaryPanel
        activeKey={secondaryPanel}
        onClose={() => setSecondaryPanel(null)}
        onBack={handleBackFromSecondary}
        accommodations={accommodations}
        transportation={transportation}
        activities={activities}
        reservations={reservations}
        trip={trip ? { arrival_date: trip.arrival_date, departure_date: trip.departure_date, id: trip.trip_id, destination: trip.destination } : null}
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

      {/* Mobile Sidebar - Hidden, using bottom navigation instead */}
      {/* Keeping Sheet component for potential future use but not showing trigger */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent
            side="left"
            className="w-[280px] px-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Access trip timeline, budget, and settings</SheetDescription>
            </SheetHeader>
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
        destination={trip?.destination}
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
        destination={trip?.destination}
        onDelete={selectedReservation ? async () => {
          await handleReservationDelete(selectedReservation.id);
          setReservationOpen(false);
          setSelectedReservation(null);
        } : undefined}
        onSubmit={async data => {
          try {
            if (selectedReservation) {
              const { error } = await supabase
                .from('reservations')
                .update(data)
                .eq('id', selectedReservation.id)
                .eq('trip_id', tripId);
              if (error) throw error;
              toast({ title: 'Success', description: 'Reservation updated' });
            } else {
              const { error } = await supabase.from('reservations').insert([data]);
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
        initialData={selectedActivity ? activityEdit : newActivity}
        tripDates={trip ? { arrival_date: trip.arrival_date, departure_date: trip.departure_date } : undefined}
        tripId={tripId || ""}
        activityId={selectedActivity}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
          queryClient.invalidateQueries({ queryKey: ["activities"] });
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
          setNewActivity({
            title: '',
            description: '',
            start_time: '',
            end_time: '',
            cost: '',
            currency: 'USD',
          });
        }}
      />

      <TravelerDialog
        open={travelerOpen}
        onOpenChange={(open) => {
          setTravelerOpen(open);
          if (!open) setSelectedTraveler(null);
        }}
        tripId={tripId}
        traveler={selectedTraveler}
      />

      {tripId && (
        <ShareTripDialog
          tripId={tripId}
          tripDestination={trip?.destination || "Trip"}
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
        />
      )}
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
