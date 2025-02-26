
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, GripVertical } from 'lucide-react';
import EditItemDialog from './EditItemDialog';
import UnsplashImage from '@/components/UnsplashImage';

interface VisionBoardItemProps {
  item: {
    id: string;
    title: string;
    description?: string;
    image_url?: string;
    source_url?: string;
    category: string;
  };
}

const VisionBoardItem: React.FC<VisionBoardItemProps> = ({ item }) => {
  const [isEditing, setIsEditing] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Type assertion to HTMLElement since we know the event target is a DOM element
    const target = e.target as HTMLElement;
    if (!target.closest('.drag-handle') && !target.closest('.external-link')) {
      setIsEditing(true);
    }
  };

  return (
    <>
      <Card ref={setNodeRef} style={style} className="flex flex-col h-full">
        <button
          onClick={handleClick}
          className="flex-grow text-left w-full focus:outline-none focus:ring-2 focus:ring-earth-500 focus:ring-offset-2 rounded-lg"
          aria-label={`Edit ${item.title}`}
        >
          {item.image_url && (
            <div className="h-40 overflow-hidden">
              <UnsplashImage 
                src={item.image_url} 
                alt={item.title} 
                className="w-full h-full object-cover" 
              />
            </div>
          )}
          <div className="p-4 flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <div className="flex items-center space-x-2">
                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <div {...attributes} {...listeners} className="drag-handle cursor-move">
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>
            </div>
            {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
          </div>
        </button>
      </Card>
      <EditItemDialog
        isOpen={isEditing}
        onOpenChange={setIsEditing}
        item={item}
        onClose={() => setIsEditing(false)}
      />
    </>
  );
};

export default VisionBoardItem;
