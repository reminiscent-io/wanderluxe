
import React from 'react';
import { Card } from '@/components/ui/card';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VisionBoardItem from './VisionBoardItem';

interface CategoryContainerProps {
  category: string;
  items: Array<{
    id: string;
    title: string;
    description?: string;
    image_url?: string;
    source_url?: string;
  }>;
  onAddItem: () => void;
}

const CategoryContainer: React.FC<CategoryContainerProps> = ({
  category,
  items,
  onAddItem
}) => {
  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
        <Button variant="ghost" size="sm" onClick={onAddItem}>
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>
      
      <div className="space-y-4">
        {items.map((item) => (
          <VisionBoardItem key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No items yet. Click "Add" to get started!
          </div>
        )}
      </div>
    </Card>
  );
};

export default CategoryContainer;
