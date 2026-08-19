import { NavLink } from "react-router-dom";
import { Calendar, BarChart2, Users, Plus, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BottomNavigationProps {
  tripId: string | undefined;
  tripPath?: string;
  onQuickAddClick: () => void;
  onPeopleClick: () => void;
  onAIClick: () => void;
}

/**
 * Shared styling for the four non-FAB slots. `min-h-[44px]` keeps every target
 * at the platform-recommended tap size, and `touch-manipulation` drops the 300ms
 * click delay that mobile Safari still applies to non-optimised targets.
 */
const slotClasses =
  "flex flex-col items-center justify-center h-full min-h-[44px] gap-1 rounded-lg " +
  "transition-colors touch-manipulation active:bg-sand-100";

const NavIcon = ({ icon: Icon, label, isActive }: { icon: LucideIcon; label: string; isActive?: boolean }) => (
  <>
    <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
    <span className={cn("text-[10px] leading-none", isActive && "font-semibold")}>{label}</span>
  </>
);

/*
 * `pb-[env(safe-area-inset-bottom)]` on the bar keeps the labels clear of the iOS
 * home indicator — without it the bottom row of a notched iPhone sits under the
 * gesture bar, where taps are swallowed by the system.
 */
const BottomNavigation = ({ tripId, tripPath, onQuickAddClick, onPeopleClick, onAIClick }: BottomNavigationProps) => {
  const base = tripPath ?? (tripId ? `/trip/${tripId}` : undefined);

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(slotClasses, isActive ? "text-earth-700" : "text-sand-600 hover:text-earth-600");

  return (
    <nav
      aria-label="Trip navigation"
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50",
        "bg-background border-t border-sand-200 shadow-warm-lg",
        "pb-[env(safe-area-inset-bottom,0px)]"
      )}
    >
      <div className="grid grid-cols-5 h-16 items-center px-2">
        {/* Timeline */}
        <NavLink to={base ? `${base}/timeline` : "/trips"} className={linkClasses}>
          {({ isActive }) => <NavIcon icon={Calendar} label="Timeline" isActive={isActive} />}
        </NavLink>

        {/* Quick Add */}
        <button type="button" onClick={onQuickAddClick} className={cn(slotClasses, "text-sand-600 hover:text-earth-600")}>
          <NavIcon icon={Plus} label="Add" />
        </button>

        {/* Center FAB - AI Chat */}
        <div className="flex items-center justify-center">
          <Button
            onClick={onAIClick}
            size="icon"
            className="h-14 w-14 rounded-full bg-earth-600 hover:bg-earth-700 active:bg-earth-800 shadow-warm-lg -mt-8 ring-4 ring-white touch-manipulation"
            aria-label="Open AI assistant"
          >
            <MessageCircle className="h-6 w-6 text-white" />
          </Button>
        </div>

        {/* Budget */}
        <NavLink to={base ? `${base}/budget` : "/trips"} className={linkClasses}>
          {({ isActive }) => <NavIcon icon={BarChart2} label="Budget" isActive={isActive} />}
        </NavLink>

        {/* People */}
        <button type="button" onClick={onPeopleClick} className={cn(slotClasses, "text-sand-600 hover:text-earth-600")}>
          <NavIcon icon={Users} label="People" />
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;
