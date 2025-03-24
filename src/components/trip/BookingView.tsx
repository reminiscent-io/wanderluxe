import React from 'react';
import { Card } from '@/components/ui/card';

interface BookingViewProps {
  tripId: string | undefined;
}

const PackingView: React.FC<BookingViewProps> = ({ tripId }) => {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-earth-500">Booking</h2>
      <Card className="p-6">
        <p className="text-gray-500">Booking features coming soon...</p>
      </Card>
    </div>
  );
};

export default BookingView;
