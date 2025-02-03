import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Car, Plane, Train, Bus, Ship } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import TransportationDialog from './transportation/TransportationDialog';
import { Tables } from '@/integrations/supabase/types';

type TransportationEvent = Tables<'transportation_events'>;

interface TransportationSectionProps {
  tripId: string;
  onTransportationChange: () => void;
}

const TransportationSection: React.FC<TransportationSectionProps> = ({
  tripId,
  onTransportationChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
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

  const formatDateTime = (date: string, time?: string | null) => {
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
    <Card className="bg-sand-50 shadow-md">
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        variant="ghost"
        className="w-full justify-between p-6 hover:bg-sand-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          <span className="text-lg font-medium">Transportation</span>
        </div>
        <Plus className="h-5 w-5" />
      </Button>

      {isExpanded && (
        <div className="p-6 pt-0 space-y-6">
          <div className="space-y-4">
            {transportationEvents?.map((event) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event)}
                className="flex items-start gap-4 p-4 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
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

          <Button
            onClick={() => {
              setSelectedEvent(undefined);
              setDialogOpen(true);
            }}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Transportation
          </Button>
        </div>
      )}

      <TransportationDialog
        tripId={tripId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={selectedEvent}
        onSuccess={handleSuccess}
      />
    </Card>
  );
};

export default TransportationSection;