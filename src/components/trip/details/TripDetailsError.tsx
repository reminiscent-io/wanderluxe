
import React from 'react';
import Navigation from '../../Navigation';
import { useNavigate } from 'react-router-dom';

interface TripDetailsErrorProps {
  message?: string;
}

const TripDetailsError: React.FC<TripDetailsErrorProps> = ({ message = 'Unable to load trip details. Please try again later.' }) => {
  const navigate = useNavigate();
  
  return (
    <div>
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Error Loading Trip</h2>
          <p className="text-gray-600 mt-2">{message}</p>
          <button 
            onClick={() => navigate('/my-trips')}
            className="mt-4 px-4 py-2 bg-earth-500 text-white rounded hover:bg-earth-600"
          >
            Return to My Trips
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripDetailsError;
