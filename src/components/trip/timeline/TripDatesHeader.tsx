
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus } from "lucide-react";

interface TripDatesHeaderProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const TripDatesHeader = ({ isExpanded, onToggle }: TripDatesHeaderProps) => {
  return (
    <Button
      onClick={onToggle}
      variant="ghost"
      className="w-full justify-between p-6 hover:bg-sand-100 transition-colors"
    >
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5" />
        <span className="text-lg font-medium">Trip Dates</span>
      </div>
      <Plus className="h-5 w-5" />
    </Button>
  );
};

export default TripDatesHeader;
