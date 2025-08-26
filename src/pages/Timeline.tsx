import React from 'react';
import { useParams } from 'react-router-dom';
import TimelineView from '@/components/trip/TimelineView';

const Timeline = () => {
  const { tripId } = useParams<{ tripId: string }>();

  if (!tripId) {
    return (
      <div className="min-h-screen bg-sand-50/95 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-earth-600 mb-4">No Trip Selected</h1>
          <p className="text-sand-600">Please select a trip to view its timeline.</p>
        </div>
      </div>
    );
  }

  return <TimelineView tripId={tripId} />;
};

export default Timeline;