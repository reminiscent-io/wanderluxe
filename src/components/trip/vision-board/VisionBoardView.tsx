
import React, { useEffect } from 'react';
import { 
  DndContext, 
  closestCenter, 
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CategoryContainer from './CategoryContainer';
import AddItemDialog from './AddItemDialog';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VisionBoardProps {
  tripId: string;
}

interface VisionBoardItem {
  id: string;
  category: string;
  title: string;
  description?: string;
  image_url?: string;
  source_url?: string;
  order_index: number;
}

const CATEGORIES = ['Accommodations', 'Activities', 'Transportation', 'Restaurants'];

const VisionBoardView: React.FC<VisionBoardProps> = ({ tripId }) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = React.useState(false);
  const queryClient = useQueryClient();

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    })
  );

  useEffect(() => {
    const channel = supabase
      .channel('vision-board-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vision_board_items',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          console.log('Realtime update:', payload);
          queryClient.invalidateQueries({ queryKey: ['vision-board', tripId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  const { data: items, isLoading } = useQuery({
    queryKey: ['vision-board', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vision_board_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('order_index');

      if (error) throw error;
      return data as VisionBoardItem[];
    }
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    try {
      const activeId = active.id.toString();
      const overId = over.id.toString();
      
      // Find the new index for the dragged item
      const newIndex = items?.findIndex(item => item.id === overId) ?? 0;

      // Update the order in the database
      const { error } = await supabase
        .from('vision_board_items')
        .update({ order_index: newIndex })
        .eq('id', activeId);

      if (error) throw error;
      toast.success('Item reordered successfully');
    } catch (error) {
      console.error('Error reordering items:', error);
      toast.error('Failed to reorder items');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Vision Board</h2>
        <Button onClick={() => setIsAddingItem(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CATEGORIES.map((category) => {
            // Filter items for this category
            const categoryItems = items?.filter(item => item.category === category) || [];
            
            return (
              <SortableContext
                key={category}
                items={categoryItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <CategoryContainer
                  id={category}
                  items={categoryItems}
                  title={category}
                />
              </SortableContext>
            );
          })}
        </div>
      </DndContext>

      <AddItemDialog
        isOpen={isAddingItem}
        onOpenChange={setIsAddingItem}
        tripId={tripId}
        selectedCategory={selectedCategory}
        onClose={() => {
          setIsAddingItem(false);
          setSelectedCategory(null);
        }}
      />
    </div>
  );
};

export default VisionBoardView;
