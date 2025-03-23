import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Plane } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import TransportationDialog from './transportation/TransportationDialog';
import TransportationListItem from './transportation/TransportationListItem';
import { Tables } from '@/integrations/supabase/types';

type TransportationEvent = Tables<'transportation_events'>;

interface TransportationSectionProps {
  tripId: string;
  onTransportationChange: () => void;
  className?: string;
}

const TransportationSection: React.FC<TransportationSectionProps> = ({
  className,
  tripId,
  onTransportationChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TransportationEvent | undefined>();

  const { data: transportationEvents, isLoading, refetch } = useQuery({
    queryKey: ['transportation-events', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transportation_events')
        .select('*')
        .eq('trip_id', tripId)
        .order('start_date', { ascending: true });

      if (error) {
        console.error("Error fetching transportation data:", error);
        throw error;
      }
      console.log("Fetched transportation data:", data);
      return data || [];
    },
    enabled: !!tripId
  });

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
          <Plane className="h-5 w-5" />
          <span className="text-lg font-medium">Flight and Transportation</span>
        </div>
        <Plus className="h-5 w-5" />
      </Button>

      {isExpanded && (
        <div className="p-6 pt-0 space-y-6">
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">
                Loading transportation data...
              </div>
            ) : (
              transportationEvents?.map((event) => (
                <TransportationListItem
                  key={event.id}
                  event={event}
                  onClick={handleEventClick}
                />
              ))
            )}
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