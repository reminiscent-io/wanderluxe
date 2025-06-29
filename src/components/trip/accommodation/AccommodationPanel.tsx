// src/components/trip/accommodation/AccommodationPanel.tsx
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  formatDateSafe,
  compareDatesSafe,
  formatTime,
  formatShortDate,
} from "@/utils/sidebarUtils";
import Header from "../_shared/Header";                       // <— create a tiny re‑export or copy snippet

interface Props {
  accommodations: any[];
  onAdd: () => void;
  onEdit: (a: any) => void;
  isMobile: boolean;
  onClose: () => void;
  onBack: () => void;
}
export default function AccommodationPanel({
  accommodations,
  onAdd,
  onEdit,
  isMobile,
  onClose,
  onBack,
}: Props) {
  const grouped = accommodations.reduce((acc: Record<string, any[]>, a) => {
    const d = a.hotel_checkin_date || "No Date";
    (acc[d] ||= []).push(a);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort(compareDatesSafe);

  return (
    <div className="p-4">
      <Header title="Accommodations" {...{ isMobile, onBack, onClose }} />

      <Button
        size="sm"
        onClick={onAdd}
        className="mb-4 w-full bg-earth-500 text-white hover:bg-earth-600"
      >
        <Plus size={14} className="mr-1" /> Add Accommodation
      </Button>

      {dates.map((d) => (
        <div key={d} className="space-y-2">
          <h5 className="border-b border-sand-200 pb-1 text-xs font-medium text-earth-700">
            {formatDateSafe(d)}
          </h5>
          {grouped[d]
            .sort((a, b) => (a.checkin_time || "").localeCompare(b.checkin_time || ""))
            .map((a) => (
              <button
                key={a.stay_id}
                onClick={() => onEdit(a)}
                className="ml-2 w-full rounded-lg bg-sand-50 p-3 text-left transition-colors hover:bg-sand-100"
              >
                <h4 className="mb-1 text-sm font-medium">{a.hotel}</h4>
                <div className="text-xs text-sand-600">
                  {`${formatShortDate(a.hotel_checkin_date)} ${formatTime(a.checkin_time)}`
                    .trim()}
                  {a.cost && (
                    <>
                      <br />
                      {(a.currency || "USD")} {a.cost.toLocaleString()}
                    </>
                  )}
                </div>
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}
