
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import TransportationList from './transportation/TransportationList';
import TransportationDialog from './transportation/TransportationDialog';
import TransportationHeader from './transportation/TransportationHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface TransportationSectionProps {
  tripId: string;
  transportations: any[];
  className?: string;
}

const TransportationSection: React.FC<TransportationSectionProps> = ({
  className,
  tripId,
  transportations
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editTransportation, setEditTransportation] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const handleEdit = (id: string) => {
    const transportToEdit = transportations.find(t => t.id === id);
    if (transportToEdit) {
      setEditTransportation(transportToEdit);
      setIsEditDialogOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transportation_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Transportation deleted');
      queryClient.invalidateQueries(['trip']);
    } catch (error) {
      console.error('Error deleting transportation:', error);
      toast.error('Failed to delete transportation');
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries(['trip']);
  };

  return (
    <Card className={`${className} shadow-md bg-white`}>
      <CardHeader className="p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold">Flight and Transportation</h2>
          </div>
          <Button 
            onClick={() => setIsAddDialogOpen(true)} 
            variant="outline" 
            size="sm"
            className="ml-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <TransportationList 
          transportations={transportations} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
        />
        
        {/* Add button for bottom of empty list */}
        {(!transportations || transportations.length === 0) && (
          <div className="text-center py-6">
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              variant="outline"
              className="bg-earth-50 hover:bg-earth-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Transportation
            </Button>
          </div>
        )}
      </CardContent>

      {/* Dialogs */}
      <TransportationDialog 
        tripId={tripId}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleSuccess}
      />

      <TransportationDialog 
        tripId={tripId}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialData={editTransportation}
        onSuccess={handleSuccess}
      />
    </Card>
  );
};

export default TransportationSection;
