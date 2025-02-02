
import { useTimeline } from "@/hooks/use-timeline";
import { format, isValid } from "date-fns";
import { ScrollArea } from "../ui/scroll-area";

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
            ? format(timestamp, 'MMM d, yyyy')
            : 'Date not set';

          return (
            <div key={event.id} className="flex gap-4 items-start border-l-2 border-primary pl-4">
              <div className="w-24 flex-shrink-0 text-sm text-muted-foreground">
                {formattedDate}
              </div>
              <div className="flex-1">
                <p className="font-medium">{event.title}</p>
                {event.description && (
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                )}
                {event.location && (
                  <p className="text-sm text-muted-foreground mt-1">📍 {event.location}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
