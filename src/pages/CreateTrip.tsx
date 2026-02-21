
import React, { useState, useEffect } from 'react';
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
    <div className="min-h-screen bg-gradient-to-br from-sand-50 via-sand-50 to-earth-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-gradient-to-br from-sand-100 via-sand-50 to-earth-100 rounded-2xl shadow-warm-xl p-8 border border-sand-200">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 text-earth-900">Plan Your Next Adventure</h1>
        <p className="text-earth-600 text-center mb-8">Where will your journey take you?</p>
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
