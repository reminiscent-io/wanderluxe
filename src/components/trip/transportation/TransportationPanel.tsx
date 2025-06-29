// src/components/trip/transportation/TransportationPanel.tsx
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatDateSafe, compareDatesSafe, formatTime } from "@/utils/sidebarUtils";
import Header from "../_shared/Header";

interface Props {
  transportation: any[];
  onAdd: () => void;
  onEdit: (t: any) => void;
  isMobile: boolean;
  onClose: () => void;
  onBack: () => void;
}
export default function TransportationPanel({
  transportation,
  onAdd,
  onEdit,
  isMobile,
  onClose,
  onBack,
}: Props) {
  const grouped = transportation.reduce((acc: Record<string, any[]>, t) => {
    const d = t.start_date || "No Date";
    (acc[d] ||= []).push(t);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort(compareDatesSafe);

  return (
    <div className="p-4">
      <Header title="Transportation" {...{ isMobile, onBack, onClose }} />

      <Button
        size="sm"
        onClick={onAdd}
        className="mb-4 w-full bg-earth-500 text-white hover:bg-earth-600"
      >
        <Plus size={14} className="mr-1" /> Add Transportation
      </Button>

      {dates.map((d) => (
        <div key={d} className="space-y-2">
          <h5 className="border-b border-sand-200 pb-1 text-xs font-medium text-earth-700">
            {formatDateSafe(d)}
          </h5>
          {grouped[d]
            .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
            .map((t) => (
              <button
                key={t.id}
                onClick={() => onEdit(t)}
                className="ml-2 w-full rounded-lg bg-sand-50 p-3 text-left transition-colors hover:bg-sand-100"
              >
                <h4 className="mb-1 text-sm font-medium">
                  {t.departure_location} – {t.arrival_location}
                </h4>
                <p className="text-xs text-sand-600">
                  {formatTime(t.start_time)} – {formatTime(t.end_time)}
                </p>
                {t.cost && (
                  <p className="text-xs text-sand-600">
                    {(t.currency || "USD")} {t.cost.toLocaleString()}
                  </p>
                )}
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}
