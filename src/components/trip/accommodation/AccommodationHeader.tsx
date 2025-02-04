import { Button } from "@/components/ui/button";
import { Hotel, Plus } from "lucide-react";

interface AccommodationHeaderProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const AccommodationHeader = ({ isExpanded, onToggle }: AccommodationHeaderProps) => {
  return (
    <Button
      onClick={onToggle}
      variant="ghost"
      className="w-full justify-between p-6 hover:bg-sand-100 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Hotel className="h-5 w-5" />
        <span className="text-lg font-medium">Accommodations</span>
      </div>
      <Plus className="h-5 w-5" />
    </Button>
  );
};

export default AccommodationHeader;