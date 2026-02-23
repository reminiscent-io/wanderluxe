// src/components/trip/accommodation/AccommodationPanel.tsx
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  formatDateSafe,
  compareDatesSafe,
  formatTime,
} from "@/utils/sidebarUtils";
import Header from "../_shared/Header";
import PhotoStrip from "../_shared/PhotoStrip";
import { parse, format } from "date-fns";
import { clearExpiredPlacePhotoCache } from "@/utils/placePhotoCache";

/* ------------------------------- types -------------------------------- */
interface Props {
  accommodations: Array<{
    stay_id: string | number;
    hotel: string;
    hotel_checkin_date?: string | null;
    hotel_checkout_date?: string | null;
    checkin_time?: string | null;
    checkout_time?: string | null;
    cost?: number | null;
    currency?: string | null;
    hotel_place_id?: string | null; // when present, enables photo strip
  }>;
  onAdd: () => void;
  onEdit: (a: any) => void;
  canEdit?: boolean;
  isMobile: boolean;
  onClose: () => void;
  onBack: () => void;
}

export default function AccommodationPanel({
  accommodations,
  onAdd,
  onEdit,
  canEdit = true,
  isMobile,
  onClose,
  onBack,
}: Props) {
  // Housekeeping: sweep expired entries occasionally
  useEffect(() => {
    clearExpiredPlacePhotoCache();
  }, []);

  // Group by check-in date
  const grouped = accommodations.reduce<Record<string, typeof accommodations>>(
    (acc, a) => {
      const key = a.hotel_checkin_date ?? "No Date";
      (acc[key] ||= []).push(a);
      return acc;
    },
    {}
  );
  const dates = Object.keys(grouped).sort(compareDatesSafe);

  return (
    <div className="p-4">
      <Header title="Accommodations" {...{ isMobile, onBack, onClose }} />

      {canEdit && (
        <Button
          size="sm"
          onClick={onAdd}
          className="mb-4 w-full bg-earth-500 text-white hover:bg-earth-600"
        >
          <Plus size={14} className="mr-1" /> Add Accommodation
        </Button>
      )}

      {dates.map((d) => (
        <div key={d} className="space-y-2">
          <h5 className="border-b border-sand-200 pb-1 text-xs font-medium text-earth-700">
            {formatDateSafe(d)}
          </h5>
          {grouped[d]
            .sort((a, b) =>
              (a.checkin_time ?? "").localeCompare(b.checkin_time ?? "")
            )
            .map((a) => {
              const cd = a.hotel_checkin_date || "";
              const od = a.hotel_checkout_date || cd;
              const sameDay = cd === od;

              let timeDisplay: string;
              if (sameDay) {
                timeDisplay = `${formatTime(a.checkin_time)} – ${formatTime(
                  a.checkout_time
                )}`;
              } else {
                const endDateObj = parse(od, "yyyy-MM-dd", new Date());
                const endLabel = format(endDateObj, "EEE, MMM d");
                timeDisplay = `${formatTime(a.checkin_time)} → ${endLabel} ${formatTime(
                  a.checkout_time
                )}`;
              }

              return (
                <div
                  key={a.stay_id}
                  className="ml-2 w-full rounded-lg bg-sand-50 p-3 text-left transition-colors hover:bg-sand-100"
                >
                  {/* Clickable header block (edit-only) */}
                  <div onClick={canEdit ? () => onEdit(a) : undefined} role={canEdit ? "button" : undefined} className={`w-full text-left ${canEdit ? 'cursor-pointer' : ''}`}>
                    <h4 className="mb-1 text-sm font-medium">{a.hotel}</h4>
                    <p className="text-xs text-sand-600">
                      {timeDisplay}
                      {a.cost != null && (
                        <>
                          <br />
                          {(a.currency || "USD")} {a.cost.toLocaleString()}
                        </>
                      )}
                    </p>
                  </div>

                  {/* Non-clickable scroller below the header */}
                  <PhotoStrip placeId={a.hotel_place_id} title={a.hotel} />
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}