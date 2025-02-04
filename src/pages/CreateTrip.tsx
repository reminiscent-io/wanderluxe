import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ImageSection from "@/components/trip/create/ImageSection";
import TimingSection from "@/components/trip/create/TimingSection";

const CreateTrip = () => {
  const [destination, setDestination] = useState("");
  const [timingType, setTimingType] = useState("timeOfYear");
  const [timeOfYear, setTimeOfYear] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { session } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user) {
      toast.error("You must be logged in to create a trip");
      return;
    }

    if (!destination) {
      toast.error("Please enter a destination");
      return;
    }

    if (timingType === "timeOfYear" && !timeOfYear) {
      toast.error("Please enter a time of year");
      return;
    }

    if (timingType === "specificDates" && (!arrivalDate || !departureDate)) {
      toast.error("Please enter both arrival and departure dates");
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('trips')
        .insert([
          {
            user_id: session.user.id,
            destination,
            start_date: timingType === "specificDates" ? arrivalDate : timeOfYear,
            end_date: timingType === "specificDates" ? departureDate : timeOfYear,
            arrival_date: timingType === "specificDates" ? arrivalDate : null,
            departure_date: timingType === "specificDates" ? departureDate : null,
            cover_image_url: coverImageUrl,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success("Trip created successfully!");
      navigate(`/trip/${data.id}`);
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error("Failed to create trip. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="destination"
                className="text-sm font-medium text-gray-700"
              >
                Destination
              </label>
              <Input
                id="destination"
                type="text"
                placeholder="Enter destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
              />
            </div>

            <ImageSection
              coverImageUrl={coverImageUrl}
              onImageChange={setCoverImageUrl}
            />

            <TimingSection
              timingType={timingType}
              onTimingTypeChange={setTimingType}
              timeOfYear={timeOfYear}
              onTimeOfYearChange={setTimeOfYear}
              arrivalDate={arrivalDate}
              onArrivalDateChange={setArrivalDate}
              departureDate={departureDate}
              onDepartureDateChange={setDepartureDate}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/my-trips")}
                className="px-3"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="px-8">
                {isLoading ? "Creating..." : "Create Trip"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTrip;