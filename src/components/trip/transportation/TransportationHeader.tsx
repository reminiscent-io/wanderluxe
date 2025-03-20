
import { Button } from "@/components/ui/button";
import { Plane, Plus } from "lucide-react";

interface TransportationHeaderProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const TransportationHeader = ({ isExpanded, onToggle }: TransportationHeaderProps) => {
  return (
    <Button
      onClick={onToggle}
      variant="ghost"
      className="w-full justify-between p-6 hover:bg-sand-100 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Plane className="h-5 w-5" />
        <span className="text-lg font-medium">Transportation</span>
      </div>
      <Plus className="h-5 w-5" />
    </Button>
  );
};

export default TransportationHeader;
