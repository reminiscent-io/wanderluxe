import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const CreateTrip = () => {
  const [tripName, setTripName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get existing trips from localStorage or initialize empty array
    const existingTrips = JSON.parse(localStorage.getItem("trips") || "[]");
    
    // Create new trip object
    const newTrip = {
      id: Date.now(),
      name: tripName,
      createdAt: new Date().toISOString(),
    };
    
    // Add new trip to array
    const updatedTrips = [...existingTrips, newTrip];
    
    // Save back to localStorage
    localStorage.setItem("trips", JSON.stringify(updatedTrips));
    
    // Show success toast
    toast({
      title: "Trip Created",
      description: `Your trip "${tripName}" has been created successfully.`,
    });
    
    // Navigate to my trips page
    navigate("/my-trips");
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Create New Trip
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="tripName"
                className="text-sm font-medium text-gray-700"
              >
                Trip Name
              </label>
              <Input
                id="tripName"
                type="text"
                placeholder="Enter trip name"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
              >
                Cancel
              </Button>
              <Button type="submit">Create Trip</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTrip;