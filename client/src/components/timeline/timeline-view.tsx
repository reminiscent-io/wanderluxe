
import { useTimeline } from "@/hooks/use-timeline";
import { format, isValid } from "date-fns";
import { ScrollArea } from "../ui/scroll-area";

export function TimelineView({ tripId }: { tripId: number }) {
  const { entries } = useTimeline(tripId);

  return (
    <ScrollArea className="h-[500px] w-full">
      <div className="space-y-4 p-4">
        {entries?.map((event, index) => {
          // Safely parse the timestamp
          const timestamp = event.startTime ? new Date(event.startTime) : null;
          const formattedDate = timestamp && isValid(timestamp) 
            ? format(timestamp, 'MMM d, yyyy')
            : 'Date not set';

          return (
            <div key={index} className="flex gap-4 items-start">
              <div className="w-24 flex-shrink-0 text-sm text-muted-foreground">
                {formattedDate}
              </div>
              <div className="flex-1">
                <p className="font-medium">{event.title}</p>
                {event.description && (
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
