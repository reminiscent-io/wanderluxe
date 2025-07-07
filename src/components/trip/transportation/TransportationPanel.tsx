// src/components/trip/transportation/TransportationPanel.tsx
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  formatDateSafe,
  compareDatesSafe,
  formatTime,
} from "@/utils/sidebarUtils";
import { format, parse } from "date-fns";
import Header from "../_shared/Header";
import { getTransportationIcon } from "@/utils/transportationUtils";

interface Props {
  transportation: Array<{
    id: string | number;
    type?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    departure_location: string;
    arrival_location: string;
    cost?: number | null;
    currency?: string | null;
  }>;
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
  // Group by start_date
  const grouped = transportation.reduce<Record<string, typeof transportation>>(
    (acc, t) => {
      const key = t.start_date ?? "No Date";
      (acc[key] ||= []).push(t);
      return acc;
    },
    {}
  );
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
            .sort((a, b) =>
              (a.start_time ?? "").localeCompare(b.start_time ?? "")
            )
            .map((t) => {
              const sd = t.start_date || "";
              const ed = t.end_date || sd;
              const sameDay = sd === ed;

              let timeDisplay: string;
              if (sameDay) {
                timeDisplay = `${formatTime(t.start_time)} – ${formatTime(
                  t.end_time
                )}`;
              } else {
                // parse end_date as local date, then format weekday/month/day
                const endDateObj = parse(ed, "yyyy-MM-dd", new Date());
                const dayLabel = format(endDateObj, "EEE, MMM d");
                timeDisplay = `${formatTime(t.start_time)} → ${dayLabel} ${formatTime(
                  t.end_time
                )}`;
              }

              return (
                <button
                  key={t.id}
                  onClick={() => onEdit(t)}
                  className="ml-2 w-full rounded-lg bg-sand-50 p-3 text-left transition-colors hover:bg-sand-100"
                >
                  <h4 className="mb-1 text-sm font-medium flex items-center gap-2">
                    <span className="text-base">{getTransportationIcon(t.type)}</span>
                    <span>{t.departure_location} – {t.arrival_location}</span>
                  </h4>
                  <p className="text-xs text-sand-600">{timeDisplay}</p>
                  {t.cost != null && (
                    <p className="text-xs text-sand-600">
                      {(t.currency || "USD")} {t.cost.toLocaleString()}
                    </p>
                  )}
                </button>
              );
            })}
        </div>
      ))}
    </div>
  );
}
