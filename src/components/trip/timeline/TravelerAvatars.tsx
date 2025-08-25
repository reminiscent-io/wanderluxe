import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  getAccommodationTravelerIds, 
  getTransportationTravelerIds, 
  getDayActivityTravelerIds, 
  getReservationTravelerIds, 
  listTravelers 
} from '@/services/travelers';

interface TravelerAvatarsProps {
  tripId: string;
  eventType: 'accommodation' | 'transportation' | 'activity' | 'dining';
  eventId: string;
  maxShow?: number;
}

const TravelerAvatars: React.FC<TravelerAvatarsProps> = ({ 
  tripId, 
  eventType, 
  eventId, 
  maxShow = 3 
}) => {
  // Get all travelers for the trip
  const { data: allTravelers = [] } = useQuery({
    queryKey: ['travelers', tripId],
    queryFn: () => listTravelers(tripId),
    select: (data) => data.data || []
  });

  // Get assigned traveler IDs for this specific event
  const { data: assignedTravelerIds = [] } = useQuery({
    queryKey: ['event-travelers', eventType, eventId],
    queryFn: async () => {
      let result;
      let actualEventId = eventId;
      
      // Handle composite IDs for accommodation check-in/check-out
      if (eventType === 'accommodation' && (eventId.startsWith('checkin-') || eventId.startsWith('checkout-'))) {
        actualEventId = eventId.replace(/^(checkin-|checkout-)/, '');
      }
      
      switch (eventType) {
        case 'accommodation':
          result = await getAccommodationTravelerIds(tripId, actualEventId);
          break;
        case 'transportation':
          result = await getTransportationTravelerIds(tripId, actualEventId);
          break;
        case 'activity':
          result = await getDayActivityTravelerIds(tripId, actualEventId);
          break;
        case 'dining':
          result = await getReservationTravelerIds(tripId, actualEventId);
          break;
        default:
          return [];
      }
      return result.data || [];
    },
    enabled: !!eventId && !!tripId
  });

  // Filter travelers to only show assigned ones
  const assignedTravelers = allTravelers.filter(traveler => 
    assignedTravelerIds.includes(traveler.id)
  );

  if (assignedTravelers.length === 0) {
    return null;
  }

  // Get initials from first name and last name
  const getInitials = (firstName: string, lastName?: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || first || '?';
  };

  // Show visible travelers and count overflow
  const visibleTravelers = assignedTravelers.slice(0, maxShow);
  const overflowCount = Math.max(0, assignedTravelers.length - maxShow);

  return (
    <TooltipProvider>
      <div className="flex -space-x-1">
        {visibleTravelers.map((traveler) => {
          const initials = getInitials(traveler.first_name, traveler.last_name);
          const displayName = `${traveler.first_name} ${traveler.last_name || ''}`.trim();
          const tooltipText = traveler.shared_with_email 
            ? `${displayName} (${traveler.shared_with_email})`
            : displayName;

          return (
            <Tooltip key={traveler.id}>
              <TooltipTrigger asChild>
                <div 
                  className={`
                    inline-flex h-6 w-6 items-center justify-center rounded-full
                    text-xs font-medium text-white ring-2 ring-white
                    ${traveler.is_owner 
                      ? 'bg-earth-600' 
                      : 'bg-sand-500'
                    }
                    hover:z-10
                  `}
                >
                  {initials}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  {tooltipText}
                  {traveler.is_owner && ' (Owner)'}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {overflowCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-400 text-xs font-medium text-white ring-2 ring-white hover:z-10">
                +{overflowCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">
                {overflowCount} more traveler{overflowCount > 1 ? 's' : ''}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default TravelerAvatars;