import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Plane, Train, Car, Bus, Ship } from "lucide-react";
import { TransportationEvent } from '@/integrations/supabase/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import TransportationDialog from './transportation/TransportationDialog';

interface TransportationSectionProps {
  tripId: string;
  onTransportationChange: () => void;
}

const TransportationSection: React.FC<TransportationSectionProps> = ({
  tripId,
  onTransportationChange
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TransportationEvent | undefined>();

  const { data: transportationEvents, refetch } = useQuery({
    queryKey: ['transportation-events', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transportation_events')
        .select('*')
        .eq('trip_id', tripId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as TransportationEvent[];
    }
  });

  const getIcon = (type: TransportationEvent['type']) => {
    switch (type) {
      case 'flight':
        return <Plane className="h-5 w-5" />;
      case 'train':
        return <Train className="h-5 w-5" />;
      case 'car_service':
      case 'rental_car':
        return <Car className="h-5 w-5" />;
      case 'shuttle':
        return <Bus className="h-5 w-5" />;
      case 'ferry':
        return <Ship className="h-5 w-5" />;
      default:
        return <Car className="h-5 w-5" />;
    }
  };

  const formatDateTime = (date: string, time?: string) => {
    const formattedDate = new Date(date).toLocaleDateString();
    if (time) {
      return `${formattedDate} ${time}`;
    }
    return formattedDate;
  };

  const handleEventClick = (event: TransportationEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    refetch();
    onTransportationChange();
    setSelectedEvent(undefined);
  };

  return (
    <>
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transportation</CardTitle>
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedEvent(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Transportation
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transportationEvents?.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-4 p-4 bg-sand-50 rounded-lg cursor-pointer hover:bg-sand-100 transition-colors"
                onClick={() => handleEventClick(event)}
              >
                {getIcon(event.type)}
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h4 className="font-semibold capitalize">
                      {event.type.replace('_', ' ')}
                    </h4>
                    {event.provider && (
                      <span className="text-sm text-gray-600">{event.provider}</span>
                    )}
                  </div>
                  {event.details && (
                    <p className="text-sm text-gray-600 mt-1">{event.details}</p>
                  )}
                  <div className="mt-2 text-sm">
                    <p>
                      From: {event.departure_location} ({formatDateTime(event.start_date, event.start_time)})
                    </p>
                    {event.end_date && (
                      <p>
                        To: {event.arrival_location} ({formatDateTime(event.end_date, event.end_time)})
                      </p>
                    )}
                  </div>
                  {event.confirmation_number && (
                    <p className="text-sm text-gray-600 mt-1">
                      Confirmation: {event.confirmation_number}
                    </p>
                  )}
                  {event.cost && (
                    <p className="text-sm text-gray-600 mt-1">
                      Cost: {event.cost} {event.currency}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <TransportationDialog
        tripId={tripId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={selectedEvent}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default TransportationSection;