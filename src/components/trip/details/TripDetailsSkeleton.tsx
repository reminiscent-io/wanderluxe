
import React from 'react';
import Navigation from '../../Navigation';

const TripDetailsSkeleton: React.FC = () => {
  // Fills the viewport, like the route fallback in App.tsx: a shorter
  // skeleton pulls the footer on screen, and the real page then pushes it
  // off again, which counts as layout shift on tall viewports.
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="h-[250px] w-full bg-sand-200 animate-pulse" />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="h-12 bg-sand-200 rounded animate-pulse" />
          <div className="h-96 bg-sand-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default TripDetailsSkeleton;
