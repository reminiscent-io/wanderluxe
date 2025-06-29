import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface HeaderProps {
  title: string;
  onBack: () => void;          // back to main sidebar list
}

/**
 * Secondary-panel header.
 * • Shows only the ← back arrow (both desktop & mobile)
 * • Keeps title centred with a spacer <span>
 */
const Header = ({ title, onBack }: HeaderProps) => (
  <div className="mb-4 flex items-center">
    <Button
      size="icon"
      variant="ghost"
      aria-label="Back"
      onClick={onBack}
    >
      <ChevronLeft size={16} />
    </Button>

    <h3 className="flex-1 text-center font-semibold text-earth-600">
      {title}
    </h3>

    <span className="w-4" /> {/* spacer so title stays centred */}
  </div>
);

export default Header;
