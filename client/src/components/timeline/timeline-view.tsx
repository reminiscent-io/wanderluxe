import { useState } from "react";
import { useTimeline } from "@/hooks/use-timeline";
import { TimelineEntry } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Plus, Calendar, MapPin, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineViewProps {
  tripId: number;
}

export function TimelineView({ tripId }: TimelineViewProps) {
  const { entries, isLoading, createEntry } = useTimeline(tripId);
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: "",
    description: "",
    startTime: new Date(),
    location: "",
    type: "activity",
    tripId: tripId,
    suggested: false,
  });

  const handleCreateEntry = async () => {
    try {
      await createEntry(newEntry);
      setIsNewEntryOpen(false);
      setNewEntry({
        title: "",
        description: "",
        startTime: new Date(),
        location: "",
        type: "activity",
        tripId: tripId,
        suggested: false,
      });
    } catch (error) {
      console.error("Failed to create entry:", error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Trip Timeline</CardTitle>
        <Dialog open={isNewEntryOpen} onOpenChange={setIsNewEntryOpen}>
          <DialogTrigger asChild>
            <Button size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Timeline Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newEntry.title}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newEntry.description ?? ""}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={format(newEntry.startTime, "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, startTime: new Date(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newEntry.location ?? ""}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, location: e.target.value })
                  }
                />
              </div>
              <Button className="w-full" onClick={handleCreateEntry}>
                Add Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : !entries || entries.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No timeline entries yet
            </div>
          ) : (
            <div className="relative">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex gap-4 pb-8 last:pb-0 relative",
                    entry.suggested && "opacity-70"
                  )}
                >
                  <div className="absolute top-0 bottom-0 left-[19px] w-px bg-border" />
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative z-10">
                    {entry.suggested ? (
                      <Sparkles className="h-5 w-5 text-primary" />
                    ) : (
                      <Calendar className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{entry.title}</h4>
                      {entry.suggested && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Suggested
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(entry.startTime), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                    {entry.description && (
                      <p className="text-sm text-muted-foreground">
                        {entry.description}
                      </p>
                    )}
                    {entry.location && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {entry.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}