import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import ImageUpload from "@/components/ImageUpload";
import { Wand2 } from "lucide-react";

const CreateTrip = () => {
  const [destination, setDestination] = useState("");
  const [timingType, setTimingType] = useState("timeOfYear");
  const [timeOfYear, setTimeOfYear] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [imageKeywords, setImageKeywords] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const navigate = useNavigate();
  const { session } = useAuth();

  const generateImage = async () => {
    if (!imageKeywords.trim()) {
      toast.error("Please enter keywords for image generation");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ keywords: imageKeywords }),
        }
      );

      const data = await response.json();
      if (data.imageUrl) {
        setCoverImageUrl(data.imageUrl);
        toast.success('Image generated successfully');
      } else {
        throw new Error('Failed to generate image');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

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

    if (timingType === "specificDates" && (!startDate || !endDate)) {
      toast.error("Please enter both start and end dates");
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
            start_date: timingType === "specificDates" ? startDate : timeOfYear,
            end_date: timingType === "specificDates" ? endDate : timeOfYear,
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

            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700">
                Cover Image
              </Label>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter keywords for image generation"
                    value={imageKeywords}
                    onChange={(e) => setImageKeywords(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={generateImage}
                    disabled={isGeneratingImage}
                    className="whitespace-nowrap"
                  >
                    {isGeneratingImage ? (
                      "Generating..."
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
                <ImageUpload
                  onImageUpload={(url) => setCoverImageUrl(url)}
                  currentImageUrl={coverImageUrl}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700">
                When are you planning to travel?
              </Label>
              <RadioGroup
                value={timingType}
                onValueChange={setTimingType}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="timeOfYear" id="timeOfYear" />
                  <Label htmlFor="timeOfYear">Time of Year</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specificDates" id="specificDates" />
                  <Label htmlFor="specificDates">Specific Dates</Label>
                </div>
              </RadioGroup>
            </div>

            {timingType === "timeOfYear" && (
              <div className="space-y-2">
                <label
                  htmlFor="timeOfYear"
                  className="text-sm font-medium text-gray-700"
                >
                  Time of Year
                </label>
                <Input
                  id="timeOfYear"
                  type="text"
                  placeholder="e.g., Summer, June, Winter holidays"
                  value={timeOfYear}
                  onChange={(e) => setTimeOfYear(e.target.value)}
                />
              </div>
            )}

            {timingType === "specificDates" && (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="startDate"
                    className="text-sm font-medium text-gray-700"
                  >
                    Start Date
                  </label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="endDate"
                    className="text-sm font-medium text-gray-700"
                  >
                    End Date
                  </label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="arrivalDate"
                    className="text-sm font-medium text-gray-700"
                  >
                    Arrival Date
                  </label>
                  <Input
                    id="arrivalDate"
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="departureDate"
                    className="text-sm font-medium text-gray-700"
                  >
                    Departure Date
                  </label>
                  <Input
                    id="departureDate"
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/my-trips")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
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
