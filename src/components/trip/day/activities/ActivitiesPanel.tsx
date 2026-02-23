// src/components/trip/day/activities/ActivitiesPanel.tsx
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatDateSafe, compareDatesSafe, formatTime } from "@/utils/sidebarUtils";
import Header from "../../_shared/Header";
import PhotoStrip from "../../_shared/PhotoStrip";
import { clearExpiredPlacePhotoCache } from "@/utils/placePhotoCache";

interface Props {
  activities: any[];
  onAdd: () => void;
  onEdit: (a: any) => void;
  canEdit?: boolean;
  isMobile: boolean;
  onClose: () => void;
  onBack: () => void;
}
export default function ActivitiesPanel({
  activities,
  onAdd,
  onEdit,
  canEdit = true,
  isMobile,
  onClose,
  onBack,
}: Props) {
  useEffect(() => {
    clearExpiredPlacePhotoCache();
  }, []);

  const grouped = activities.reduce((acc: Record<string, any[]>, a) => {
    const d = a.trip_days?.date || "No Date";
    (acc[d] ||= []).push(a);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort(compareDatesSafe);

  return (
    <div className="p-4">
      <Header title="Activities" {...{ isMobile, onBack, onClose }} />

      {canEdit && (
        <Button
          size="sm"
          onClick={onAdd}
          className="mb-4 w-full bg-earth-500 text-white hover:bg-earth-600"
        >
          <Plus size={14} className="mr-1" /> Add Activity
        </Button>
      )}

      {dates.map((d) => (
        <div key={d} className="space-y-2">
          <h5 className="border-b border-sand-200 pb-1 text-xs font-medium text-earth-700">
            {formatDateSafe(d)}
          </h5>
          {grouped[d]
            .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
            .map((a) => (
              <div
                key={a.id}
                className="ml-2 w-full rounded-lg bg-sand-50 p-3 text-left transition-colors hover:bg-sand-100"
              >
                {/* Clickable header area */}
                <div
                  onClick={canEdit ? () => onEdit(a) : undefined}
                  role={canEdit ? "button" : undefined}
                  className={`w-full text-left ${canEdit ? 'cursor-pointer' : ''}`}
                >
                  <h4 className="mb-1 text-sm font-medium">{a.title}</h4>
                  <p className="text-xs text-sand-600">
                    {formatTime(a.start_time)} – {formatTime(a.end_time)}
                  </p>
                  {a.cost && (
                    <p className="text-xs text-sand-600">
                      {(a.currency || "USD")} {a.cost.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Non-clickable photo strip */}
                <PhotoStrip placeId={a.location_place_id} title={a.title} />
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
