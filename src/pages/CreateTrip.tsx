import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CreateTripForm from "@/components/trip/create/CreateTripForm";

const CreateTrip = () => {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to create a trip");
      return;
    }

    setIsLoading(true);
    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert([{
          user_id: user.id,
          destination,
          start_date: startDate,
          end_date: endDate,
          cover_image_url: coverImageUrl,
        }])
        .select()
        .single();

      if (tripError) throw tripError;

      toast.success("Trip created successfully!");
      navigate(`/trip/${trip.id}`);
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error("Failed to create trip");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create a New Trip</h1>
      <CreateTripForm
        destination={destination}
        setDestination={setDestination}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        coverImageUrl={coverImageUrl}
        setCoverImageUrl={setCoverImageUrl}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/my-trips')}
      />
    </div>
  );
};

export default CreateTrip;