import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import TransportationList from './transportation/TransportationList';
import TransportationDialog from './transportation/TransportationDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TransportationHeader } from './transportation/TransportationHeader';
import { Transportation } from '@/types/trip';

interface TransportationSectionProps {
  tripId: string;
  onTransportationChange: () => void;
  transportations: Transportation[]; // NEW prop
  className?: string;
}

const TransportationSection: React.FC<TransportationSectionProps> = ({
  className,
  tripId,
  onTransportationChange,
  transportations,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const handleEdit = (id: string) => {
    const eventToEdit = transportations.find((event) => event.id === id);
    if (eventToEdit) {
      setSelectedEvent(eventToEdit);
      setDialogOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('transportation')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Failed to delete transportation');
    } else {
      toast.success('Transportation deleted successfully');
      onTransportationChange();
    }
  };

  return (
    <Card className="bg-sand-50 shadow-md max-w-5xl mx-auto">
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
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Transportation
          </Button>

          <TransportationList
            transportations={transportations}
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
          onTransportationChange();
          setSelectedEvent(null);
        }}
      />
    </Card>
  );
};

export default TransportationSection;
