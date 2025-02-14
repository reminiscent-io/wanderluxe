
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
    // Stop event propagation to prevent category container click
    e.stopPropagation();
    
    // Don't open edit dialog if clicking the drag handle or external link
    if (
      (e.target as HTMLElement).closest('.drag-handle') ||
      (e.target as HTMLElement).closest('.external-link')
    ) {
      return;
    }
    setIsEditing(true);
  };

  return (
    <>
      <Card 
        ref={setNodeRef} 
        style={style} 
        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleClick}
      >
        <div className="flex flex-col h-full">
          {/* Image Section - Fixed height */}
          {item.image_url && (
            <div className="w-full h-32 relative bg-gray-100">
              <UnsplashImage
                url={item.image_url}
                className="w-full h-full object-cover"
                showAttribution={false}
              />
            </div>
          )}
          
          {/* Content Section - Flex grow to fill remaining space */}
          <div className="p-3 flex-grow">
            <div className="flex gap-3">
              <div {...attributes} {...listeners} className="flex items-center drag-handle">
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-gray-500 hover:text-gray-700 external-link shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                
                {item.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
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
