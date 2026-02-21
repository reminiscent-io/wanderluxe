import React from 'react';
import { Plane, Hotel, Ticket, UtensilsCrossed, AlertTriangle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExtractedItem, TravelItemType } from '@/types/ai-assistant';

interface ExtractedItemCardProps {
  item: ExtractedItem;
  onStatusChange?: (id: string, status: 'created' | 'skipped') => void;
  /** Called when the card is clicked (to open the full edit dialog). Omit when processed. */
  onEdit?: () => void;
  compact?: boolean;
}

const ITEM_TYPE_CONFIG: Record<TravelItemType, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
}> = {
  transportation: {
    icon: <Plane className="w-4 h-4" />,
    label: 'Transportation',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  accommodation: {
    icon: <Hotel className="w-4 h-4" />,
    label: 'Accommodation',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  activity: {
    icon: <Ticket className="w-4 h-4" />,
    label: 'Activity',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50'
  },
  reservation: {
    icon: <UtensilsCrossed className="w-4 h-4" />,
    label: 'Dining',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50'
  }
};

// Get display summary based on item type
function getItemSummary(item: ExtractedItem): { title: string; subtitle: string } {
  const { fields, itemType } = item;

  switch (itemType) {
    case 'transportation': {
      const type = (fields.type as string) || 'Transport';
      const carrier = fields.carrier as string;
      const from = fields.departure_location as string;
      const to = fields.arrival_location as string;
      const date = fields.departure_date as string;
      const time = fields.departure_time as string;

      const typeLabel = type === 'flight' ? 'Flight' :
                        type === 'train' ? 'Train' :
                        type === 'ferry' ? 'Ferry' :
                        type === 'rental_car' ? 'Car Rental' :
                        type === 'car_service' ? 'Car Service' :
                        type === 'shuttle' ? 'Shuttle' : 'Transport';

      const route = from && to ? `${from} → ${to}` : from || to || '';
      const title = carrier ? `${typeLabel}: ${carrier}` : typeLabel;
      const dateStr = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
      const subtitle = [route, dateStr, time].filter(Boolean).join(' • ');

      return { title, subtitle };
    }

    case 'accommodation': {
      const name = (fields.name as string) || 'Hotel';
      const checkIn = fields.check_in_date as string;
      const checkOut = fields.check_out_date as string;
      const address = fields.address as string;

      const dateRange = checkIn && checkOut
        ? `${new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`
        : checkIn || '';

      return {
        title: name,
        subtitle: [dateRange, address].filter(Boolean).join(' • ')
      };
    }

    case 'activity': {
      const name = (fields.name as string) || 'Activity';
      const date = fields.date as string;
      const time = fields.start_time as string;
      const location = fields.location as string;

      const dateStr = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';

      return {
        title: name,
        subtitle: [dateStr, time, location].filter(Boolean).join(' • ')
      };
    }

    case 'reservation': {
      const name = (fields.restaurant_name as string) || 'Restaurant';
      const date = fields.date as string;
      const time = fields.time as string;
      const partySize = fields.party_size as number;

      const dateStr = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
      const partySizeStr = partySize ? `${partySize} guests` : '';

      return {
        title: name,
        subtitle: [dateStr, time, partySizeStr].filter(Boolean).join(' • ')
      };
    }

    default:
      return { title: 'Unknown Item', subtitle: '' };
  }
}

const ExtractedItemCard: React.FC<ExtractedItemCardProps> = ({
  item,
  onStatusChange,
  onEdit,
  compact = false
}) => {
  const config = ITEM_TYPE_CONFIG[item.itemType];
  const { title, subtitle } = getItemSummary(item);
  const hasWarnings = item.missingRequired.length > 0 || item.confidence < 0.7;
  const isProcessed = item.status === 'created' || item.status === 'skipped';
  const isClickable = !isProcessed && onEdit;

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onEdit : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit?.(); } } : undefined}
      className={cn(
        'rounded-lg border transition-all overflow-hidden',
        isProcessed ? 'opacity-60' : '',
        item.status === 'created' ? 'bg-green-50 border-green-200' :
        item.status === 'skipped' ? 'bg-sand-50 border-sand-200' :
        hasWarnings ? 'bg-amber-50 border-amber-200' : 'bg-background border-sand-200',
        compact ? 'p-2' : 'p-3',
        isClickable && 'cursor-pointer hover:ring-2 hover:ring-earth-300 hover:ring-offset-1 focus:outline-none focus:ring-2 focus:ring-earth-500 focus:ring-offset-1'
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 rounded-md p-1.5',
          config.bgColor,
          config.color
        )}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className={cn('text-xs font-medium', config.color)}>
              {config.label}
            </span>
            {item.status === 'created' && (
              <span className="text-xs text-green-600 flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Added
              </span>
            )}
            {item.status === 'skipped' && (
              <span className="text-xs text-sand-500 flex items-center gap-0.5">
                <X className="w-3 h-3" /> Skipped
              </span>
            )}
          </div>
          <h4 className={cn(
            'font-medium text-earth-700 truncate',
            compact ? 'text-sm' : 'text-base'
          )}>
            {title}
          </h4>
          {subtitle && (
            <p className={cn(
              'text-sand-600 truncate',
              compact ? 'text-xs' : 'text-sm'
            )}>
              {subtitle}
            </p>
          )}

          {/* Click to edit hint (when in stepper / edit flow) */}
          {isClickable && (
            <p className="mt-1 text-xs text-earth-500">Click to edit details</p>
          )}

          {/* Warnings */}
          {hasWarnings && !isProcessed && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              <span>
                {item.missingRequired.length > 0
                  ? `Missing: ${item.missingRequired.join(', ')}`
                  : 'Low confidence - please verify'}
              </span>
            </div>
          )}
        </div>

        {/* Confidence indicator */}
        {!compact && !isProcessed && (
          <div className="flex-shrink-0">
            <div
              className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                item.confidence >= 0.9 ? 'bg-green-100 text-green-700' :
                item.confidence >= 0.7 ? 'bg-sand-100 text-sand-700' :
                'bg-amber-100 text-amber-700'
              )}
            >
              {Math.round(item.confidence * 100)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtractedItemCard;
