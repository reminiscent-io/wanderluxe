import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import TimelineRow from './TimelineRow';
import { TimelineItem } from './timeline-utils';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';

type Props = {
  item: TimelineItem;
  idx: number;
  isLast: boolean;
  tripId: string;
  isPast?: boolean;
  onActivityClick?: (a: DayActivity) => void;
  onHotelClick?: (h: HotelStay) => void;
  onTransportationClick?: (t: Transportation) => void;
  onReservationClick?: (r: RestaurantReservation) => void;
};

const SortableTimelineRow: React.FC<Props> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isDragging && "z-50 opacity-90 shadow-warm-lg rounded-xl"
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-20 p-1 rounded cursor-grab active:cursor-grabbing",
          "sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
          "text-earth-400 hover:text-earth-600"
        )}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <TimelineRow {...props} />
    </div>
  );
};

export default React.memo(SortableTimelineRow);
