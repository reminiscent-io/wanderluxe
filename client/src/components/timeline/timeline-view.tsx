import { useTimeline } from "@/hooks/use-timeline";
import { format } from "date-fns";
import { ScrollArea } from "../ui/scroll-area";

export function TimelineView() {
  const { events } = useTimeline();

  return (
    <ScrollArea className="h-[500px] w-full">
      <div className="space-y-4 p-4">
        {events?.map((event, index) => {
          // Safely parse the timestamp
          const timestamp = event.timestamp ? new Date(event.timestamp) : null;
          const isValidDate = timestamp && !isNaN(timestamp.getTime());

          return (
            <div key={index} className="flex gap-4 items-start">
              <div className="w-24 flex-shrink-0 text-sm text-muted-foreground">
                {isValidDate ? format(timestamp, 'MMM d, yyyy') : 'Invalid date'}
              </div>
              <div className="flex-1">
                <p className="text-sm">{event.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}