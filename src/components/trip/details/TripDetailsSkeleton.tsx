
import React from 'react';
import Navigation from '../../Navigation';

const TripDetailsSkeleton: React.FC = () => {
  return (
    <div>
      <Navigation />
      <div className="h-[250px] w-full bg-gray-200 animate-pulse" />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="h-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default TripDetailsSkeleton;
