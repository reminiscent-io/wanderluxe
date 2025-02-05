import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CreateTripForm from '../components/trip/create/CreateTripForm';

const CreateTrip = () => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to create a trip');
        return;
      }

      const { data, error } = await supabase
        .from('trips')
        .insert([
          {
            user_id: user.id,
            destination,
            arrival_date: startDate,
            departure_date: endDate,
            cover_image_url: coverImageUrl
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success('Trip created successfully!');
      navigate(`/trips/${data.trip_id}`);
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
  );
};

export default CreateTrip;
