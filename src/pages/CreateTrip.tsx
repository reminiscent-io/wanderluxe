
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

  useEffect(() => {
    // Track page view
    window.gtag('event', 'page_view', {
      page_title: 'Create Trip',
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  }, []);

  const handleSubmit = async (tripId: string) => {
    setIsLoading(true);
    try {
      // Track successful trip creation
      window.gtag('event', 'trip_created', {
        event_category: 'Trip',
        event_label: destination,
        value: 1
      });
      toast.success('Trip created successfully!');
      navigate(`/trip/${tripId}`);
    } catch (error) {
      console.error('Error navigating to trip:', error);
      toast.error('Failed to navigate to trip');
    } finally {
      setIsLoading(false);
    }
  };
  
 
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-semibold text-center mb-8">Create New Trip</h1>
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
    </div>
  );
};

export default CreateTrip;
