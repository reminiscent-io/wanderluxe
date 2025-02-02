import { useState } from "react";
import { useTrips } from "@/hooks/use-trips";
import { TripCard } from "@/components/trip-card";
import { ChatInterface } from "@/components/chat-interface";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";
import { TimelineView } from "@/components/timeline/timeline-view";

export default function Home() {
  const { trips, createTrip, isLoading } = useTrips();
  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [newTrip, setNewTrip] = useState({
    title: "",
    destination: "",
    budget: "",
  });
  const { toast } = useToast();

  const handleCreateTrip = async () => {
    try {
      if (!newTrip.title) {
        toast({
          title: "Error",
          description: "Title is required",
          variant: "destructive",
        });
        return;
      }

      await createTrip({
        title: newTrip.title,
        destination: newTrip.destination,
        budget: newTrip.budget ? parseInt(newTrip.budget) : null,
        status: "planning",
      });
      setIsNewTripOpen(false);
      setNewTrip({ title: "", destination: "", budget: "" });
      toast({
        title: "Success",
        description: "Trip created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create trip",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Luxury Travel Planner</h1>
          <Dialog open={isNewTripOpen} onOpenChange={setIsNewTripOpen}>
            <DialogTrigger asChild>
              <Button size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby="dialog-title">
              <DialogHeader>
                <DialogTitle id="dialog-title">Create New Trip</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newTrip.title}
                    onChange={(e) =>
                      setNewTrip({ ...newTrip, title: e.target.value })
                    }
                    placeholder="Summer Vacation 2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    value={newTrip.destination}
                    onChange={(e) =>
                      setNewTrip({ ...newTrip, destination: e.target.value })
                    }
                    placeholder="Paris, France"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget (USD)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={newTrip.budget}
                    onChange={(e) =>
                      setNewTrip({ ...newTrip, budget: e.target.value })
                    }
                    placeholder="5000"
                  />
                </div>
                <Button className="w-full" onClick={handleCreateTrip}>
                  Create Trip
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <ErrorBoundary>
  <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Trips</h2>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-border" />
                </div>
              ) : trips?.length === 0 ? (
                <div className="text-center text-muted-foreground p-4">
                  No trips yet. Create your first luxury travel experience!
                </div>
              ) : (
                trips?.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onClick={() => setSelectedTrip(trip.id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {selectedTrip ? (
              <>
                <TimelineView tripId={selectedTrip} />
                <ChatInterface tripId={selectedTrip} />
                <FileUpload
                  tripId={selectedTrip}
                  onSuccess={() =>
                    toast({
                      title: "Success",
                      description: "File uploaded successfully",
                    })
                  }
                />
              </>
            ) : (
              <div className="h-[600px] flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Select a Trip to Start Planning
                  </h3>
                  <p>
                    Chat with our AI travel assistant to plan your perfect luxury
                    experience
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}