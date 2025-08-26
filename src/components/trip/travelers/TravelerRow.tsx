import { useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Share2, Shield } from "lucide-react";
import { Traveler } from "@/hooks/useTravelers";
import { cn } from "@/lib/utils";

interface TravelerRowProps {
  traveler: Traveler;
  onEdit: () => void;   // open the dialog to edit/delete/share
  tripId: string;       // kept for parity; not used here directly
}

export default function TravelerRow({ traveler, onEdit }: TravelerRowProps) {
  const getInitials = useCallback(() => {
    const firstInitial = (traveler.first_name || "T").charAt(0).toUpperCase();
    const lastInitial = (traveler.last_name || "").charAt(0).toUpperCase();
    return (firstInitial + lastInitial) || firstInitial || "T";
  }, [traveler.first_name, traveler.last_name]);

  const getFullName = useCallback(() => {
    return [traveler.first_name || "Traveler", traveler.last_name]
      .filter(Boolean)
      .join(" ");
  }, [traveler.first_name, traveler.last_name]);

  const hasEmail = !!traveler.shared_with_email;
  const isOwner = !!(traveler as any).is_owner;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEdit();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={onKeyDown}
      className={cn(
        "p-3 rounded-lg transition-colors cursor-pointer",
        "bg-sand-50 hover:bg-sand-100"
      )}
      aria-label={`Edit traveler ${getFullName()}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback
              className={cn(
                "text-xs",
                isOwner ? "bg-earth-600 text-white" : "bg-earth-100 text-earth-700"
              )}
            >
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="text-sm font-medium truncate">{getFullName()}</h4>

              {isOwner && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  <Shield className="h-3 w-3" />
                  Owner
                </span>
              )}

              {hasEmail && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex"
                    >
                      <Share2 className="h-3 w-3 text-earth-500 shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Shared via email</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {traveler.shared_with_email && (
              <p className="text-xs text-gray-500 truncate">
                {traveler.shared_with_email}
              </p>
            )}
          </div>
        </div>

        {/* No in-row actions — edits happen in the dialog */}
      </div>
    </div>
  );
}
