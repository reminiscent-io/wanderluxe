import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  getAccommodationTravelerIds,
  getTransportationTravelerIds,
  getDayActivityTravelerIds,
  getReservationTravelerIds,
  listTravelers,
} from "@/services/travelers";

type EventType = "accommodation" | "transportation" | "activity" | "dining";

interface Traveler {
  id: string;
  first_name: string;
  last_name?: string | null;
  shared_with_email?: string | null;
  is_owner?: boolean | null;
  avatar_url?: string | null;
}

interface TravelerAvatarsProps {
  tripId: string;
  eventType: EventType;
  eventId: string;
  maxShow?: number;
}

function asTravelerArray(input: unknown): Traveler[] {
  if (Array.isArray(input)) return input as Traveler[];
  if (input && typeof input === "object") {
    const anyInput = input as any;
    if (Array.isArray(anyInput.data)) return anyInput.data as Traveler[];
    if (Array.isArray(anyInput.travelers)) return anyInput.travelers as Traveler[];
  }
  return [];
}

function asIdArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return (input as unknown[]).filter((v): v is string => typeof v === "string");
}

const TravelerAvatars: React.FC<TravelerAvatarsProps> = ({
  tripId,
  eventType,
  eventId,
  maxShow = 3,
}) => {
  // Namespaced keys to avoid shape collisions with other hooks
  const { data: allTravelersRaw } = useQuery({
    queryKey: ["trip-travelers:list", tripId],
    queryFn: () => listTravelers(tripId),
    select: (raw) => asTravelerArray(raw),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const allTravelers = allTravelersRaw ?? [];

  const { data: assignedIdsRaw } = useQuery({
    queryKey: ["trip-travelers:assigned", tripId, eventType, eventId],
    queryFn: async () => {
      switch (eventType) {
        case "accommodation": {
          const res = await getAccommodationTravelerIds(tripId, eventId);
          return res?.data ?? res ?? [];
        }
        case "transportation": {
          const res = await getTransportationTravelerIds(tripId, eventId);
          return res?.data ?? res ?? [];
        }
        case "activity": {
          const res = await getDayActivityTravelerIds(tripId, eventId);
          return res?.data ?? res ?? [];
        }
        case "dining": {
          const res = await getReservationTravelerIds(tripId, eventId);
          return res?.data ?? res ?? [];
        }
        default:
          return [];
      }
    },
    select: (raw) => asIdArray(raw),
    enabled: Boolean(tripId && eventId),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const assignedIds = assignedIdsRaw ?? [];

  const assignedTravelers = useMemo(
    () => allTravelers.filter((t) => assignedIds.includes(t.id)),
    [allTravelers, assignedIds]
  );

  if (assignedTravelers.length === 0) return null;

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const f = (firstName ?? "").trim();
    const l = (lastName ?? "").trim();
    const a = f ? f[0].toUpperCase() : "";
    const b = l ? l[0].toUpperCase() : "";
    return (a + b) || a || "?";
  };

  const visible = assignedTravelers.slice(0, maxShow);
  const overflowCount = Math.max(0, assignedTravelers.length - maxShow);

  return (
    <TooltipProvider>
      <div className="flex -space-x-1">
        {visible.map((t) => {
          const initials = getInitials(t.first_name, t.last_name);
          const displayName = [t.first_name, t.last_name].filter(Boolean).join(" ");
          const tooltipText = t.shared_with_email
            ? `${displayName} (${t.shared_with_email})`
            : displayName;

          return (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <Avatar
                  className={`h-6 w-6 ring-2 ring-white hover:z-10 ${
                    t.is_owner ? "bg-earth-600" : "bg-sand-500"
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
                <p className="text-sm">
                  {tooltipText}
                  {t.is_owner ? " (Owner)" : ""}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {overflowCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sand-400 text-xs font-medium text-white ring-2 ring-white hover:z-10">
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
    </TooltipProvider>
  );
};

export default TravelerAvatars;
