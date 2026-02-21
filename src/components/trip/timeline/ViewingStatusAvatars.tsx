import React, { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTripViewingStatus } from "@/hooks/useTripViewingStatus";
import { useTravelers, Traveler } from "@/hooks/useTravelers";

interface ViewingStatusAvatarsProps {
  tripId: string;
  maxShow?: number;
}

type ViewingCategory = "active" | "viewed" | "never";

interface TravelerWithViewStatus extends Traveler {
  viewingCategory: ViewingCategory;
  lastViewed?: string;
}

const ViewingStatusAvatars: React.FC<ViewingStatusAvatarsProps> = ({
  tripId,
  maxShow = 8,
}) => {
  const { travelers, loading: travelersLoading } = useTravelers(tripId);
  const { viewingStatuses, isLoading: statusLoading } = useTripViewingStatus(tripId);

  // Combine travelers with their viewing status
  const travelersWithStatus = useMemo(() => {
    if (!travelers || travelers.length === 0) return [];

    return travelers.map((traveler): TravelerWithViewStatus => {
      // Find viewing status for this traveler by matching shared_with_user_id
      const status = viewingStatuses.find((vs) => {
        // Match by shared_with_user_id (auth.users.id)
        return traveler.shared_with_user_id && vs.user_id === traveler.shared_with_user_id;
      });

      let viewingCategory: ViewingCategory = "never";
      let lastViewed: string | undefined;

      if (status) {
        if (status.currently_viewing) {
          viewingCategory = "active";
        } else {
          viewingCategory = "viewed";
        }
        lastViewed = status.last_viewed_at;
      }

      return {
        ...traveler,
        viewingCategory,
        lastViewed,
      };
    }).sort((a, b) => {
      // Sort: active first, then viewed, then never
      const order: Record<ViewingCategory, number> = { active: 0, viewed: 1, never: 2 };
      return order[a.viewingCategory] - order[b.viewingCategory];
    });
  }, [travelers, viewingStatuses]);

  // All travelers with their status (could filter current user if desired)
  const displayTravelers = travelersWithStatus;

  if (travelersLoading || statusLoading) {
    return null;
  }

  if (displayTravelers.length === 0) {
    return null;
  }

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const f = (firstName ?? "").trim();
    const l = (lastName ?? "").trim();
    const a = f ? f[0].toUpperCase() : "";
    const b = l ? l[0].toUpperCase() : "";
    return a + b || a || "?";
  };

  const getBorderColor = (category: ViewingCategory): string => {
    switch (category) {
      case "active":
        return "ring-green-500"; // Green for actively viewing
      case "viewed":
        return "ring-sand-400"; // Grey for has viewed
      case "never":
        return "ring-earth-800"; // Black/dark for never viewed
    }
  };

  const getStatusText = (category: ViewingCategory, lastViewed?: string): string => {
    switch (category) {
      case "active":
        return "Currently viewing";
      case "viewed":
        if (lastViewed) {
          const date = new Date(lastViewed);
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (diffMins < 1) return "Just now";
          if (diffMins < 60) return `${diffMins}m ago`;
          if (diffHours < 24) return `${diffHours}h ago`;
          if (diffDays === 1) return "Yesterday";
          return date.toLocaleDateString();
        }
        return "Viewed";
      case "never":
        return "Not yet viewed";
    }
  };

  const visible = displayTravelers.slice(0, maxShow);
  const overflowCount = Math.max(0, displayTravelers.length - maxShow);

  // Count by status for summary
  const activeCount = displayTravelers.filter((t) => t.viewingCategory === "active").length;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {visible.map((t) => {
            const initials = getInitials(t.first_name, t.last_name);
            const displayName = [t.first_name, t.last_name].filter(Boolean).join(" ");
            const statusText = getStatusText(t.viewingCategory, t.lastViewed);
            const borderColor = getBorderColor(t.viewingCategory);

            return (
              <Tooltip key={t.id}>
                <TooltipTrigger asChild>
                  <Avatar
                    className={`h-8 w-8 ring-2 ${borderColor} hover:z-10 cursor-default transition-all ${
                      t.viewingCategory === "active" ? "ring-[3px]" : ""
                    }`}
                  >
                    {t.avatar_url && (
                      <AvatarImage src={t.avatar_url} alt={displayName} />
                    )}
                    <AvatarFallback
                      className={`text-xs font-medium text-white ${
                        t.is_owner ? "bg-earth-600" : "bg-sand-500"
                      }`}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <p className="font-medium">
                      {displayName}
                      {t.is_owner ? " (Owner)" : ""}
                    </p>
                    <p className={`text-xs ${
                      t.viewingCategory === "active"
                        ? "text-green-600"
                        : t.viewingCategory === "viewed"
                        ? "text-muted-foreground"
                        : "text-muted-foreground"
                    }`}>
                      {statusText}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {overflowCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sand-400 text-xs font-medium text-white ring-2 ring-white hover:z-10">
                  +{overflowCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  {overflowCount} more traveler{overflowCount > 1 ? "s" : ""}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {activeCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {activeCount === 1 ? "1 viewing" : `${activeCount} viewing`}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ViewingStatusAvatars;
