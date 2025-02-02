import { useTimeline } from "@/hooks/use-timeline";
import { format, isValid } from "date-fns";
import { ScrollArea } from "../ui/scroll-area";
import { Calendar, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TimelineView({ tripId }: { tripId: number }) {
  const { entries, isLoading } = useTimeline(tripId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-pulse text-muted-foreground">Loading timeline...</div>
      </div>
    );
  }

  if (!entries?.length) {
    return (
      <div className="flex items-center justify-center h-[500px] text-muted-foreground">
        No timeline entries yet.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-4 p-4">
        {entries.map((event) => {
          const timestamp = event.startTime ? new Date(event.startTime) : null;
          const formattedDate = timestamp && isValid(timestamp)
            ? format(timestamp, "MMM d, yyyy h:mm a")
            : "Date not set";

          return (
            <div
              key={event.id}
              className={cn(
                "flex gap-4 items-start p-4 rounded-lg border bg-card",
                event.suggested && "opacity-70"
              )}
            >
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/10">
                {event.suggested ? (
                  <Sparkles className="h-4 w-4 text-primary" />
                ) : (
                  <Calendar className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium line-clamp-1">{event.title}</h3>
                  {event.suggested && (
                    <Badge variant="secondary" className="shrink-0">Suggested</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formattedDate}
                </p>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {event.description}
                  </p>
                )}
                {event.location && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    📍 <span className="line-clamp-1">{event.location}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}