import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsCoarsePointer } from '@/hooks/use-mobile';
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

  /*
   * The grip handle is revealed on hover, so on a touch screen it is unreachable
   * — which left reordering as a desktop-only feature. Touch devices instead get
   * the whole row as the drag surface, paired with the TouchSensor's long-press
   * activation: a press-and-hold picks the row up, while a tap still opens it and
   * a swipe still scrolls.
   */
  const isCoarsePointer = useIsCoarsePointer();

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    /*
     * Without this, iOS answers the long-press with its own text-selection
     * callout and magnifier before the drag ever starts. `manipulation` still
     * permits panning, so the list scrolls normally.
     */
    ...(isCoarsePointer
      ? { touchAction: 'manipulation', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }
      : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isCoarsePointer ? listeners : {})}
      className={cn(
        "group relative",
        isDragging && "z-50 opacity-90 shadow-warm-lg rounded-xl"
      )}
    >
      {/* Drag Handle — pointer devices only; touch drags from the row itself. */}
      <div
        {...attributes}
        {...(isCoarsePointer ? {} : listeners)}
        aria-label={`Reorder ${props.item.title}`}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-20 p-0.5 rounded cursor-grab active:cursor-grabbing",
          "hidden sm:block sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 transition-opacity",
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
