import { NavLink } from "react-router-dom";
import { Calendar, BarChart2, Users, Plus, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BottomNavigationProps {
  tripId: string | undefined;
  tripPath?: string;
  onQuickAddClick: () => void;
  onPeopleClick: () => void;
  onAIClick: () => void;
}

const BottomNavigation = ({ tripId, tripPath, onQuickAddClick, onPeopleClick, onAIClick }: BottomNavigationProps) => {
  const base = tripPath ?? (tripId ? `/trip/${tripId}` : undefined);

  const timelineItem = {
    title: "Timeline",
    icon: Calendar,
    href: base ? `${base}/timeline` : "/trips",
  };

  const budgetItem = {
    title: "Budget",
    icon: BarChart2,
    href: base ? `${base}/budget` : "/trips",
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-sand-200 shadow-warm-lg">
      <div className="grid grid-cols-5 h-16 items-center px-2">
        {/* Timeline */}
        <NavLink
          to={timelineItem.href}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center h-full space-y-1 rounded-lg transition-colors",
              isActive
                ? "text-earth-700"
                : "text-sand-600 hover:text-earth-600"
            )
          }
        >
          {({ isActive }) => {
            const Icon = timelineItem.icon;
            return (
              <>
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                <span className={cn("text-[10px]", isActive && "font-semibold")}>
                  {timelineItem.title}
                </span>
              </>
            );
          }}
        </NavLink>

        {/* Quick Add */}
        <button
          onClick={onQuickAddClick}
          className="flex flex-col items-center justify-center h-full space-y-1 rounded-lg transition-colors text-sand-600 hover:text-earth-600"
        >
          <Plus className="h-5 w-5" />
          <span className="text-[10px]">Add</span>
        </button>

        {/* Center FAB - AI Chat */}
        <div className="flex items-center justify-center">
          <Button
            onClick={onAIClick}
            size="icon"
            className="h-14 w-14 rounded-full bg-earth-600 hover:bg-earth-700 shadow-warm-lg -mt-8 ring-4 ring-white"
            aria-label="AI Chat"
          >
            <MessageCircle className="h-6 w-6 text-white" />
          </Button>
        </div>

        {/* Budget */}
        <NavLink
          to={budgetItem.href}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center h-full space-y-1 rounded-lg transition-colors",
              isActive
                ? "text-earth-700"
                : "text-sand-600 hover:text-earth-600"
            )
          }
        >
          {({ isActive }) => {
            const Icon = budgetItem.icon;
            return (
              <>
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                <span className={cn("text-[10px]", isActive && "font-semibold")}>
                  {budgetItem.title}
                </span>
              </>
            );
          }}
        </NavLink>

        {/* People */}
        <button
          onClick={onPeopleClick}
          className="flex flex-col items-center justify-center h-full space-y-1 rounded-lg transition-colors text-sand-600 hover:text-earth-600"
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px]">People</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;
