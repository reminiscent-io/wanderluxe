import { NavLink, useNavigate } from "react-router-dom";
import { Calendar, BarChart2, Users, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BottomNavigationProps {
  tripId: string | undefined;
  onQuickAddClick: () => void;
  onAIClick: () => void;
  onPeopleClick: () => void;
}

const BottomNavigation = ({ tripId, onQuickAddClick, onAIClick, onPeopleClick }: BottomNavigationProps) => {
  const timelineItem = {
    title: "Timeline",
    icon: Calendar,
    href: tripId ? `/trip/${tripId}/timeline` : "/trips",
  };

  const budgetItem = {
    title: "Budget",
    icon: BarChart2,
    href: tripId ? `/trip/${tripId}/budget` : "/trips",
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-sand-200 shadow-lg">
      <div className="grid grid-cols-5 h-16 items-center px-2">
        {/* First item: Timeline */}
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

        {/* Second item: AI Assistant (opens drawer) */}
        <button
          onClick={onAIClick}
          className="flex flex-col items-center justify-center h-full space-y-1 rounded-lg transition-colors text-sand-600 hover:text-earth-600"
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-[10px]">AI</span>
        </button>

        {/* Center FAB */}
        <div className="flex items-center justify-center">
          <Button
            onClick={onQuickAddClick}
            size="icon"
            className="h-14 w-14 rounded-full bg-earth-600 hover:bg-earth-700 shadow-lg -mt-8 ring-4 ring-white"
            aria-label="Quick add"
          >
            <Plus className="h-6 w-6 text-white" />
          </Button>
        </div>

        {/* Fourth item: Budget */}
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

        {/* Fifth item: People */}
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
