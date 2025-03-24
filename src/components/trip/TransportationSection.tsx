import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Plane } from "lucide-react";
import TransportationDialog from './transportation/TransportationDialog';
import TransportationList from './transportation/TransportationList';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
        <>
          <div className="mb-4">
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Transportation
            </Button>
          </div>

          <TransportationList
            transportations={transportations || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          {/* Dialog for adding a new transportation */}
          <TransportationDialog
            tripId={tripId}
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSuccess={handleSuccess}
          />

          {/* Dialog for editing an existing transportation */}
          <TransportationDialog
            tripId={tripId}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            initialData={editTransportation || undefined}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </Card>
  );
};

export default TransportationSection;