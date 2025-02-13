
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import VisionBoardItem from './VisionBoardItem';
import { Card } from '@/components/ui/card';

interface CategoryContainerProps {
  id: string;
  items: Array<{
    id: string;
    title: string;
    description?: string;
    image_url?: string;
    source_url?: string;
    category: string;
  }>;
  title: string;
}

const CategoryContainer: React.FC<CategoryContainerProps> = ({ id, items, title }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-4 space-y-4 ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
      {...listeners}
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <VisionBoardItem key={item.id} item={item} />
        ))}
      </div>
    </Card>
  );
};

export default CategoryContainer;
