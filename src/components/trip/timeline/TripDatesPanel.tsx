// src/components/trip/timeline/TripDatesPanel.tsx
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import Header from "@/components/trip/_shared/Header";

interface TripDatesPanelProps {
  trip: { arrival_date: string; departure_date: string } | null;
  onEdit: () => void;
  /* NEW props injected by SecondaryPanel */
  isMobile: boolean;
  onClose: () => void;
  onBack: () => void;
}

export default function TripDatesPanel({
  trip,
  onEdit,
  isMobile,
  onClose,
  onBack,
}: TripDatesPanelProps) {
  const nights =
    trip?.arrival_date && trip?.departure_date
      ? Math.ceil(
          (new Date(trip.departure_date).getTime() -
            new Date(trip.arrival_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

  return (
    <div className="p-4">
      {/* Shared header with ← / ✕ logic */}
      <Header
        title="Trip Dates"
        isMobile={isMobile}
        onBack={onBack}
        onClose={onClose}
      />

      <Button
        size="sm"
        onClick={onEdit}
        className="mb-4 w-full bg-earth-500 text-white hover:bg-earth-600"
      >
        <Edit size={14} className="mr-1" />
        Edit Dates
      </Button>

      {trip && (
        <div className="space-y-3">
          <div className="rounded-lg bg-sand-50 p-3">
            <p className="text-sm font-medium text-earth-600">Arrival Date</p>
            <p className="text-sm text-sand-700">{trip.arrival_date}</p>
          </div>
          <div className="rounded-lg bg-sand-50 p-3">
            <p className="text-sm font-medium text-earth-600">Departure Date</p>
            <p className="text-sm text-sand-700">{trip.departure_date}</p>
          </div>
          <div className="rounded-lg bg-sand-50 p-3">
            <p className="text-sm font-medium text-earth-600">Duration</p>
            <p className="text-sm text-sand-700">
              {nights !== null ? `${nights} night${nights === 1 ? "" : "s"}` : "-"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
