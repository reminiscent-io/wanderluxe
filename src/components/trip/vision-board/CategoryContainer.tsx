
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import VisionBoardItem from './VisionBoardItem';

interface CategoryContainerProps {
  id: string;
  title: string;
  items: any[];
}

const CategoryContainer: React.FC<CategoryContainerProps> = ({ id, title, items }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="bg-sand-50 p-4 rounded-lg shadow border border-sand-200"
    >
      <h3 className="font-semibold text-xl mb-4 text-gray-900">{title}</h3>
      
      {items.length === 0 ? (
        <div className="text-gray-500 text-sm italic">No items yet</div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {items.map(item => (
            <div key={item.id} className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-0.75rem)]">
              <VisionBoardItem item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryContainer;
