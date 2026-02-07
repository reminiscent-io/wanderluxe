import { Building, Plane, MapPin, UtensilsCrossed } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type QuickAddAction = "accommodation" | "transportation" | "activity" | "dining";

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAction: (action: QuickAddAction) => void;
}

const quickAddActions = [
  {
    key: "accommodation" as const,
    title: "Stay",
    description: "Hotel, resort, or rental",
    icon: Building,
    accent: "bg-earth-600",
  },
  {
    key: "transportation" as const,
    title: "Transport",
    description: "Flight, train, or car",
    icon: Plane,
    accent: "bg-earth-500",
  },
  {
    key: "activity" as const,
    title: "Experience",
    description: "Tour, activity, or attraction",
    icon: MapPin,
    accent: "bg-earth-400",
  },
  {
    key: "dining" as const,
    title: "Dining",
    description: "Restaurant or reservation",
    icon: UtensilsCrossed,
    accent: "bg-earth-500",
  },
];

const QuickAddSheet = ({ open, onOpenChange, onSelectAction }: QuickAddSheetProps) => {
  const handleActionClick = (action: QuickAddAction) => {
    onSelectAction(action);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[20px] px-0 pb-0 pt-0 border-t-0 bg-white"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-sand-300" />
        </div>

        <SheetHeader className="text-left px-6 pb-5 pt-2">
          <SheetTitle className="text-lg font-semibold tracking-tight text-earth-900">
            Add to trip
          </SheetTitle>
          <SheetDescription className="sr-only">
            Choose what you'd like to add to your trip
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8 space-y-1.5">
          {quickAddActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                onClick={() => handleActionClick(action.key)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl",
                  "transition-all duration-150 ease-out",
                  "hover:bg-sand-100 active:bg-sand-200 active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-earth-400 focus-visible:ring-offset-2",
                  "group"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-11 h-11 rounded-xl",
                    "bg-sand-100 group-hover:bg-sand-200",
                    "transition-colors duration-150"
                  )}
                >
                  <Icon className="h-5 w-5 text-earth-700" strokeWidth={1.8} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[15px] font-medium text-earth-900 leading-tight">
                    {action.title}
                  </div>
                  <div className="text-[13px] text-sand-600 mt-0.5 leading-tight">
                    {action.description}
                  </div>
                </div>
                <svg
                  className="w-4 h-4 text-sand-400 group-hover:text-earth-500 transition-colors duration-150"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickAddSheet;
