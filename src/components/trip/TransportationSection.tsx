
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import TransportationHeader from './transportation/TransportationHeader';
import TransportationDialog from './transportation/TransportationDialog';
import { useTripDays } from '@/hooks/use-trip-days';

interface TransportationSectionProps {
  tripId: string;
}

const TransportationSection = ({ tripId }: TransportationSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingTransportation, setIsAddingTransportation] = useState(false);
  const { days } = useTripDays(tripId);

  return (
    <Card className="bg-sand-50 shadow-md">
      <TransportationHeader 
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {isExpanded && (
        <TransportationDialog
          tripId={tripId}
          open={isAddingTransportation}
          onOpenChange={setIsAddingTransportation}
          onSuccess={() => {
            setIsAddingTransportation(false);
          }}
        />
      )}
    </Card>
  );
};

export default TransportationSection;
