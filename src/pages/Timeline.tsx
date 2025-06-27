import React from 'react';
import AppLayout from "@/components/layout/AppLayout";
import { Card } from '@/components/ui/card';

const Timeline = () => {
  return (
    <AppLayout>
      <div className="min-h-screen bg-sand-50/95">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-earth-600 mb-8">Timeline</h1>
          <Card className="p-6">
            <p className="text-sand-600">Timeline view coming soon...</p>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Timeline;