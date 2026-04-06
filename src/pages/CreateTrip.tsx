import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CreateTripForm from '../components/trip/create/CreateTripForm';

const CreateTrip = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.gtag('event', 'page_view', {
      page_title: 'Create Trip',
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  }, []);

  const handleSubmit = (tripId: string) => {
    window.gtag('event', 'trip_created', {
      event_category: 'Trip',
      event_label: 'New Trip',
      value: 1
    });
    toast.success('Trip created successfully!');
    navigate(`/trip/${tripId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-50 via-sand-50 to-earth-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-gradient-to-br from-sand-100 via-sand-50 to-earth-100 rounded-2xl shadow-warm-xl p-6 sm:p-8 border border-sand-200">
        <CreateTripForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/my-trips')}
        />
      </div>
    </div>
  );
};

export default CreateTrip;
