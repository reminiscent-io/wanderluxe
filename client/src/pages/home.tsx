import { useState } from "react";
import { useTrips } from "@/hooks/use-trips";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Home() {
  const { createTrip } = useTrips();
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
        budget: newTrip.budget ? parseInt(newTrip.budget) : undefined,
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
      <header className="fixed w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 z-50 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <h1 className="text-2xl font-bold cursor-pointer">Wanderlust</h1>
          </Link>
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/explore">
              <span className="text-sm font-medium hover:text-primary transition-colors">Explore</span>
            </Link>
            <Link href="/my-trips">
              <span className="text-sm font-medium hover:text-primary transition-colors">My Trips</span>
            </Link>
            <Link href="/inspiration">
              <span className="text-sm font-medium hover:text-primary transition-colors">Inspiration</span>
            </Link>
            <Button 
              variant="default"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setIsNewTripOpen(true)}
            >
              Create Trip
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative pt-16">
        <div 
          className="h-[calc(100vh-4rem)] bg-cover bg-center relative flex items-center"
          style={{
            backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("/images/hero-background.jpg")'
          }}
        >
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center text-white space-y-6">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                Travel Planning
                <br />
                Reimagined
              </h1>
              <p className="text-xl md:text-2xl text-white/90">
                Discover Your Next Adventure
              </p>
              <p className="text-lg text-white/80">
                Create unforgettable journeys with our intelligent travel companion
              </p>
              <div className="pt-4">
                <Button
                  size="lg"
                  onClick={() => setIsNewTripOpen(true)}
                  className="bg-white text-black hover:bg-white/90"
                >
                  Start Planning
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create Trip Dialog */}
      <Dialog open={isNewTripOpen} onOpenChange={setIsNewTripOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Trip</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Trip Title</Label>
              <Input
                id="title"
                value={newTrip.title}
                onChange={(e) => setNewTrip({ ...newTrip, title: e.target.value })}
                placeholder="Summer Vacation 2025"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                value={newTrip.destination}
                onChange={(e) => setNewTrip({ ...newTrip, destination: e.target.value })}
                placeholder="Paris, France"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="budget">Budget (USD)</Label>
              <Input
                id="budget"
                type="number"
                value={newTrip.budget}
                onChange={(e) => setNewTrip({ ...newTrip, budget: e.target.value })}
                placeholder="5000"
              />
            </div>
          </div>
          <Button onClick={handleCreateTrip} className="w-full">
            Create Trip
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}