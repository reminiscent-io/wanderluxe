import { Building, Car, MapPin, UtensilsCrossed, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAction: (action: "accommodation" | "transportation" | "activity" | "dining" | "import") => void;
}

const featuredAction = {
  key: "import" as const,
  title: "AI Import",
  description: "Scan booking confirmation or ask AI",
  icon: Sparkles,
  color: "text-indigo-600",
  bgColor: "bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100",
};

const quickAddActions = [
  {
    key: "accommodation" as const,
    title: "Accommodation",
    description: "Add hotel or lodging",
    icon: Building,
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100",
  },
  {
    key: "transportation" as const,
    title: "Transportation",
    description: "Add flight, train, or car",
    icon: Car,
    color: "text-green-600",
    bgColor: "bg-green-50 hover:bg-green-100",
  },
  {
    key: "activity" as const,
    title: "Activity",
    description: "Add tour or experience",
    icon: MapPin,
    color: "text-purple-600",
    bgColor: "bg-purple-50 hover:bg-purple-100",
  },
  {
    key: "dining" as const,
    title: "Dining",
    description: "Add restaurant reservation",
    icon: UtensilsCrossed,
    color: "text-orange-600",
    bgColor: "bg-orange-50 hover:bg-orange-100",
  },
];

const QuickAddSheet = ({ open, onOpenChange, onSelectAction }: QuickAddSheetProps) => {
  const handleActionClick = (action: "accommodation" | "transportation" | "activity" | "dining" | "import") => {
    onSelectAction(action);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-2xl">
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="text-xl font-semibold text-earth-800">
            What would you like to add?
          </SheetTitle>
          <SheetDescription className="text-sand-600">
            Choose a category to quickly add to your trip
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 pb-6">
          {/* Featured AI Import */}
          <Button
            onClick={() => handleActionClick(featuredAction.key)}
            variant="outline"
            className={cn(
              "w-full h-auto py-4 flex items-center justify-start space-x-4 border-2 transition-all",
              featuredAction.bgColor,
              "border-transparent hover:border-indigo-300"
            )}
          >
            <div className={cn("p-3 rounded-full bg-white shadow-sm", featuredAction.color)}>
              <featuredAction.icon className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-earth-800 text-base">
                {featuredAction.title}
              </div>
              <div className="text-xs text-sand-600 mt-0.5">
                {featuredAction.description}
              </div>
            </div>
          </Button>

          {/* Standard actions grid */}
          <div className="grid grid-cols-2 gap-3">
            {quickAddActions.map((action) => (
              <Button
                key={action.key}
                onClick={() => handleActionClick(action.key)}
                variant="outline"
                className={cn(
                  "h-auto py-6 flex flex-col items-center justify-center space-y-3 border-2 transition-all",
                  action.bgColor,
                  "border-transparent hover:border-current"
                )}
              >
                <div className={cn("p-3 rounded-full bg-white shadow-sm", action.color)}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-earth-800 text-sm">
                    {action.title}
                  </div>
                  <div className="text-xs text-sand-600 mt-0.5">
                    {action.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickAddSheet;
