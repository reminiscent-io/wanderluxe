import { Button } from "@/components/ui/button";
import { Plus, UserPlus } from "lucide-react";
import { useTravelers } from "@/hooks/useTravelers";
import Header from "../_shared/Header";
import TravelerRow from "./TravelerRow";

interface TravelersPanelProps {
  tripId: string;
  onAdd: () => void;
  onEdit: (traveler: any) => void;
  isMobile: boolean;
  onClose: () => void;
  onBack: () => void;
}

export default function TravelersPanel({
  tripId,
  onAdd,
  onEdit,
  isMobile,
  onClose,
  onBack,
}: TravelersPanelProps) {
  const { travelers, loading, error } = useTravelers(tripId);

  if (loading) {
    return (
      <div className="p-4">
        <Header title="Travelers" {...{ isMobile, onBack, onClose }} />
        <div className="text-center py-12">
          <p className="text-gray-500">Loading travelers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Header title="Travelers" {...{ isMobile, onBack, onClose }} />
        <div className="text-center py-12">
          <p className="text-red-500">Error loading travelers: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Header title="Travelers" {...{ isMobile, onBack, onClose }} />

      <Button
        size="sm"
        onClick={onAdd}
        className="mb-4 w-full bg-earth-500 text-white hover:bg-earth-600"
      >
        <UserPlus size={14} className="mr-1" /> Add Traveler
      </Button>

      {travelers.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">No travelers yet. Add your first traveler.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {travelers.map((traveler) => (
            <TravelerRow
              key={traveler.id}
              traveler={traveler}
              onEdit={() => onEdit(traveler)}
              tripId={tripId}
            />
          ))}
        </div>
      )}
    </div>
  );
}