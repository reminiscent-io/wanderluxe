import { useState } from "react";
import { useTrips } from "@/hooks/use-trips";
import { ErrorBoundary } from "@/components/error-boundary";
import { DialogDescription } from "@/components/ui/dialog";
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
import { Link } from "wouter";

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
      if (!newTrip.title || !newTrip.destination) {
        toast({
          title: "Error",
          description: "Title and destination are required",
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
      {/* Navigation */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <h1 className="text-2xl font-semibold cursor-pointer">Wanderlust</h1>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/explore">
              <span className="text-sm font-medium hover:text-primary cursor-pointer">Explore</span>
            </Link>
            <Link href="/my-trips">
              <span className="text-sm font-medium hover:text-primary cursor-pointer">My Trips</span>
            </Link>
            <Link href="/inspiration">
              <span className="text-sm font-medium hover:text-primary cursor-pointer">Inspiration</span>
            </Link>
          </nav>

          <Dialog open={isNewTripOpen} onOpenChange={setIsNewTripOpen}>
            <DialogTrigger asChild>
              <Button>Create Trip</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Trip</DialogTitle>
                <DialogDescription>Enter the details for your new luxury travel experience</DialogDescription>
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

      {!selectedTrip ? (
        <div className="relative min-h-[600px] flex items-center justify-center bg-cover bg-center" 
             style={{
               backgroundImage: 'url("https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=2568&auto=format&fit=crop&ixlib=rb-4.0.3")',
               backgroundPosition: 'center',
             }}>
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Content */}
          <div className="relative text-center text-white space-y-6 max-w-4xl mx-auto px-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">Travel Planning Reimagined</h1>
            <p className="text-xl md:text-2xl text-white/90">Discover Your Next Adventure</p>
            <p className="text-lg text-white/80">Create unforgettable journeys with our intelligent travel companion</p>
            <Button 
              size="lg" 
              onClick={() => setIsNewTripOpen(true)}
              className="bg-white text-black hover:bg-white/90"
            >
              Start Planning
            </Button>
          </div>
        </div>
      ) : (
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
              </div>
            </div>
          </main>
        </ErrorBoundary>
      )}
    </div>
  );
}