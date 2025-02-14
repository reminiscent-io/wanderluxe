import React, { useEffect } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
    },
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    try {
      const activeId = active.id.toString();
      const overId = over.id.toString();
      const oldIndex = items?.findIndex(item => item.id === activeId) ?? 0;
      const newIndex = items?.findIndex(item => item.id === overId) ?? 0;

      const newItems = [...(items || [])];
      const [reorderedItem] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, reorderedItem);

      queryClient.setQueryData(['vision-board', tripId], newItems);

      const { error } = await supabase
        .from('vision_board_items')
        .update({ order_index: newIndex })
        .eq('id', activeId);

      if (error) throw error;
      toast.success('Item reordered successfully');
    } catch (error) {
      console.error('Error reordering items:', error);
      toast.error('Failed to reorder items');
      queryClient.invalidateQueries({ queryKey: ['vision-board', tripId] });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Vision Board</h2>
        <Button onClick={() => setIsAddingItem(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
        {CATEGORIES.map((category) => {
          const categoryItems = items?.filter(item => item.category === category) || [];
          return (
            <SortableContext
              key={category}
              items={categoryItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <CategoryContainer
                id={category}
                title={category}
                items={categoryItems}
              />
            </SortableContext>
          );
        })}
      </div>
      <AddItemDialog
        isOpen={isAddingItem}
        onOpenChange={setIsAddingItem}
        tripId={tripId}
        onClose={() => {
          setIsAddingItem(false);
          setSelectedCategory(null);
        }}
      />
    </DndContext>
  );
};

export default VisionBoardView;
