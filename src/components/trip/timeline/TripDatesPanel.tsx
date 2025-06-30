// src/components/trip/timeline/TripDatesPanel.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import Header from "@/components/trip/_shared/Header";
import { parse, differenceInCalendarDays, format } from "date-fns";

interface TripDatesPanelProps {
  trip: { arrival_date: string; departure_date: string } | null;
  onEdit: () => void;
  isMobile: boolean;
  onClose: () => void;
  onBack: () => void;
}

/** Parse an ISO “YYYY-MM-DD” string to a local‐midnight Date */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function TripDatesPanel({
  trip,
  onEdit,
  isMobile,
  onClose,
  onBack,
}: TripDatesPanelProps) {
  if (!trip) return null;

  const arrivalDate = parseLocalDate(trip.arrival_date);
  const departureDate = parseLocalDate(trip.departure_date);
  const nights = differenceInCalendarDays(departureDate, arrivalDate);

  return (
    <div className="p-4">
      <Header title="Trip Dates" isMobile={isMobile} onBack={onBack} onClose={onClose} />

      <Button
        size="sm"
        onClick={onEdit}
        className="mb-4 w-full bg-earth-500 text-white hover:bg-earth-600"
      >
        <Edit size={14} className="mr-1" />
        Edit Dates
      </Button>

      <div className="space-y-3">
        <div className="rounded-lg bg-sand-50 p-3">
          <p className="text-sm font-medium text-earth-600">Arrival Date</p>
          <p className="text-sm text-sand-700">
            {format(arrivalDate, "EEE, MMM d")}
          </p>
        </div>
        <div className="rounded-lg bg-sand-50 p-3">
          <p className="text-sm font-medium text-earth-600">Departure Date</p>
          <p className="text-sm text-sand-700">
            {format(departureDate, "EEE, MMM d")}
          </p>
        </div>
        <div className="rounded-lg bg-sand-50 p-3">
          <p className="text-sm font-medium text-earth-600">Duration</p>
          <p className="text-sm text-sand-700">
            {nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
