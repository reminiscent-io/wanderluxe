// src/components/trip/SecondaryPanel.tsx
import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import AccommodationPanel from "@/components/trip/accommodation/AccommodationPanel";
import TransportationPanel from "@/components/trip/transportation/TransportationPanel";
import ActivitiesPanel from "@/components/trip/day/activities/ActivitiesPanel";
import ReservationsPanel from "@/components/trip/dining/ReservationsPanel";
import TripDatesPanel from "@/components/trip/timeline/TripDatesPanel";
import TravelersPanel from "@/components/trip/travelers/TravelersPanel";

/* --- tiny media-query hook ------------------------------------------------ */
function useMediaQuery(q: string) {
  const [m, setM] = useState(
    typeof window !== "undefined" && window.matchMedia(q).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(q);
    const handler = () => setM(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [q]);
  return m;
}
/* ------------------------------------------------------------------------- */

interface SecondaryPanelProps {
  activeKey: string | null;
  onClose: () => void;  // ✕ or backdrop
  onBack: () => void;   // ←
  canEdit?: boolean;

  accommodations: any[];
  transportation: any[];
  activities: any[];
  reservations: any[];
  trip: { arrival_date: string; departure_date: string; id: string; destination?: string } | null;

  onAccommodationAdd: () => void;
  onAccommodationEdit: (a: any) => void;
  onTransportationAdd: () => void;
  onTransportationEdit: (t: any) => void;
  onActivityAdd: () => void;
  onActivityEdit: (a: any) => void;
  onReservationAdd: () => void;
  onReservationEdit: (r: any) => void;
  onTravelerAdd: () => void;
  onTravelerEdit: (t: any) => void;
  onEditDates: () => void;
}

export default function SecondaryPanel(props: SecondaryPanelProps) {
  const {
    activeKey,
    onClose,
    onBack,
    canEdit = true,
    accommodations,
    transportation,
    activities,
    reservations,
    trip,
    onAccommodationAdd,
    onAccommodationEdit,
    onTransportationAdd,
    onTransportationEdit,
    onActivityAdd,
    onActivityEdit,
    onReservationAdd,
    onReservationEdit,
    onTravelerAdd,
    onTravelerEdit,
    onEditDates,
  } = props;

  if (!activeKey) return null;

  const isMobile = useMediaQuery("(max-width: 767px)");
  const headerProps = { onBack };

  /* pick panel component */
  let panel: JSX.Element | null = null;
  switch (activeKey) {
    case "accommodations":
      panel = (
        <AccommodationPanel
          {...headerProps}
          accommodations={accommodations}
          onAdd={onAccommodationAdd}
          onEdit={onAccommodationEdit}
          canEdit={canEdit}
          isMobile={isMobile}
          onClose={onClose}
        />
      );
      break;
    case "transportation":
      panel = (
        <TransportationPanel
          {...headerProps}
          transportation={transportation}
          onAdd={onTransportationAdd}
          onEdit={onTransportationEdit}
          canEdit={canEdit}
          isMobile={isMobile}
          onClose={onClose}
        />
      );
      break;
    case "activities":
      panel = (
        <ActivitiesPanel
          {...headerProps}
          activities={activities}
          onAdd={onActivityAdd}
          onEdit={onActivityEdit}
          canEdit={canEdit}
          isMobile={isMobile}
          onClose={onClose}
        />
      );
      break;
    case "reservations":
      panel = (
        <ReservationsPanel
          {...headerProps}
          reservations={reservations}
          onAdd={onReservationAdd}
          onEdit={onReservationEdit}
          canEdit={canEdit}
          isMobile={isMobile}
          onClose={onClose}
        />
      );
      break;
    case "dates":
      panel = (
        <TripDatesPanel
          {...headerProps}
          trip={trip}
          onEdit={onEditDates}
          canEdit={canEdit}
          isMobile={isMobile}
          onClose={onClose}
        />
      );
      break;
    case "travelers":
      panel = (
        <TravelersPanel
          {...headerProps}
          tripId={trip?.id || ""}
          tripDestination={trip?.destination || "Trip"}
          onAdd={onTravelerAdd}
          onEdit={onTravelerEdit}
          isMobile={isMobile}
          onClose={onClose}
        />
      );
      break;
  }
  if (!panel) return null;

  /* ---------------- Desktop (≥768 px) ---------------- */
  if (!isMobile) {
    /**  primary sidebar width 280px  +  secondary column width 320px  = 600px  **/
    return (
      <>
        {/* backdrop covers only the content area right of 600 px */}
        <div
          className="hidden md:block fixed inset-y-0 right-0 left-[600px] z-30"
          role="presentation"
          onClick={onClose}
        />
        {/* secondary sidebar */}
        <div
          className="hidden md:block fixed left-[280px] w-[320px] z-40 overflow-y-auto border-r border-sand-200 bg-white"
          style={{
            top: "calc(4rem + env(safe-area-inset-top, 0px))",
            height: "calc(calc(var(--app-height, 1vh) * 100) - 4rem - env(safe-area-inset-top, 0px))"
          }}
        >
          {panel}
        </div>
      </>
    );
  }

  /* ---------------- Mobile Sheet (<768 px) ---------------- */
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="left"
        className="w-full flex flex-col h-full px-0 pt-[env(safe-area-inset-top)] pb-0"
      >
        <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {panel}
        </div>
      </SheetContent>
    </Sheet>
  );
}
