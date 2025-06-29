// src/components/trip/dining/ReservationsPanel.tsx
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatDateSafe, compareDatesSafe, formatTime } from "@/utils/sidebarUtils";
import Header from "../_shared/Header";

interface Props {
  reservations: any[];
  onAdd: () => void;
  onEdit: (r: any) => void;
  isMobile: boolean;
  onClose: () => void;
  onBack: () => void;
}
export default function ReservationsPanel({
  reservations,
  onAdd,
  onEdit,
  isMobile,
  onClose,
  onBack,
}: Props) {
  const grouped = reservations.reduce((acc: Record<string, any[]>, r) => {
    const d = r.trip_days?.date || "No Date";
    (acc[d] ||= []).push(r);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort(compareDatesSafe);

  return (
    <div className="p-4">
      <Header title="Reservations" {...{ isMobile, onBack, onClose }} />

      <Button
        size="sm"
        onClick={onAdd}
        className="mb-4 w-full bg-earth-500 text-white hover:bg-earth-600"
      >
        <Plus size={14} className="mr-1" /> Add Reservation
      </Button>

      {dates.map((d) => (
        <div key={d} className="space-y-2">
          <h5 className="border-b border-sand-200 pb-1 text-xs font-medium text-earth-700">
            {formatDateSafe(d)}
          </h5>
          {grouped[d]
            .sort((a, b) => (a.reservation_time || "").localeCompare(b.reservation_time || ""))
            .map((r) => (
              <button
                key={r.id}
                onClick={() => onEdit(r)}
                className="ml-2 w-full rounded-lg bg-sand-50 p-3 text-left transition-colors hover:bg-sand-100"
              >
                <h4 className="mb-1 text-sm font-medium">{r.restaurant_name}</h4>
                <p className="text-xs text-sand-600">{formatTime(r.reservation_time)}</p>
                {r.number_of_people && (
                  <p className="text-xs text-sand-600">{r.number_of_people} people</p>
                )}
                {r.cost && (
                  <p className="text-xs text-sand-600">
                    {(r.currency || "USD")} {r.cost.toLocaleString()}
                  </p>
                )}
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}
