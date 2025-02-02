import { useTimeline } from "@/hooks/use-timeline";
import { format, isValid } from "date-fns";
import { ScrollArea } from "../ui/scroll-area";
import { Calendar, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TimelineView({ tripId }: { tripId: number }) {
  const { entries, isLoading } = useTimeline(tripId);

  if (isLoading) {
    return <div className="p-4">Loading timeline...</div>;
  }

  if (!entries?.length) {
    return <div className="p-4">No timeline entries yet.</div>;
  }

  return (
    <ScrollArea className="h-[500px] w-full">
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
                "flex gap-4 items-start p-4 rounded-lg border",
                event.suggested ? "opacity-70" : ""
              )}
            >
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/10">
                {event.suggested ? (
                  <Sparkles className="h-4 w-4 text-primary" />
                ) : (
                  <Calendar className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{event.title}</h3>
                  {event.suggested && (
                    <Badge variant="secondary">Suggested</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formattedDate}
                </p>
                {event.description && (
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                )}
                {event.location && (
                  <p className="text-sm text-muted-foreground">📍 {event.location}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}