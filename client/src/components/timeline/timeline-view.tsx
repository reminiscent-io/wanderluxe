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
import { Plus, Calendar, MapPin, Clock, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TimelineViewProps {
  tripId: number;
}

export function TimelineView({ tripId }: TimelineViewProps) {
  const { entries, isLoading, createEntry } = useTimeline(tripId);
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const { toast } = useToast();
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
      toast({
        title: "Success",
        description: "Timeline entry created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create timeline entry",
        variant: "destructive",
      });
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
              <div className="space-y-2">
                <Label>Entry Type</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="suggested"
                    checked={newEntry.suggested}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, suggested: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="suggested">Mark as suggestion</Label>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={handleCreateEntry}
                disabled={!newEntry.title || !newEntry.startTime}
              >
                Add Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-border" />
            </div>
          ) : !entries || entries.length === 0 ? (
            <div className="text-center text-muted-foreground p-4">
              No timeline entries yet. Start by adding your first activity!
            </div>
          ) : (
            <div className="relative">
              {entries
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map((entry, index, array) => {
                  const isFirstOfDay = index === 0 || 
                    new Date(entry.startTime).toDateString() !== 
                    new Date(array[index - 1].startTime).toDateString();

                  return (
                    <div key={entry.id}>
                      {isFirstOfDay && (
                        <div className="font-semibold text-sm text-muted-foreground my-4 first:mt-0">
                          {format(new Date(entry.startTime), "EEEE, MMMM d, yyyy")}
                        </div>
                      )}
                      <div
                        className={cn(
                          "flex gap-4 pb-8 last:pb-0 relative",
                          entry.suggested && "opacity-70 hover:opacity-100 transition-opacity"
                        )}
                      >
                        <div className="absolute top-0 bottom-0 left-[19px] w-px bg-border" />
                        <div 
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center relative z-10",
                            entry.suggested ? "bg-primary/10" : "bg-primary/20"
                          )}
                        >
                          {entry.suggested ? (
                            <Sparkles className="h-5 w-5 text-primary" />
                          ) : (
                            <Calendar className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium leading-none">{entry.title}</h4>
                            {entry.suggested && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full leading-none">
                                Suggested
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(new Date(entry.startTime), "h:mm a")}
                            </span>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-muted-foreground">
                              {entry.description}
                            </p>
                          )}
                          {entry.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{entry.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}