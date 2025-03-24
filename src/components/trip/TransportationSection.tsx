import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import TransportationList from './transportation/TransportationList';
import TransportationDialog from './transportation/TransportationDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TransportationHeader } from './transportation/TransportationHeader';

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
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

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
      return data || [];
    },
    enabled: !!tripId
  });

  const handleEdit = (id: string) => {
    const eventToEdit = transportationEvents?.find(event => event.id === id);
    if (eventToEdit) {
      setSelectedEvent(eventToEdit);
      setDialogOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('transportation_events')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Failed to delete transportation');
    } else {
      toast.success('Transportation deleted successfully');
      refetch();
      onTransportationChange();
    }
  };

  return (
    <Card className="bg-sand-50 shadow-md">
      <TransportationHeader
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {isExpanded && (
        <div className="p-4">
          <Button
            onClick={() => {
              setSelectedEvent(null);
              setDialogOpen(true);
            }}
            className="w-full bg-earth-500 hover:bg-earth-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Transportation
          </Button>

          <TransportationList
            transportations={transportationEvents || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      <TransportationDialog
        tripId={tripId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={selectedEvent}
        onSuccess={() => {
          refetch();
          onTransportationChange();
          setSelectedEvent(null);
        }}
      />
    </Card>
  );
};

export default TransportationSection;