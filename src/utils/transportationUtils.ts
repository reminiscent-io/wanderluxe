
import { Database } from '@/integrations/supabase/types/database';

type TransportationType = Database["public"]["Enums"]["transportation_type"];

/**
 * Format transportation type for display
 */
export const formatTransportationType = (type: TransportationType | string | null): string => {
  if (!type) return 'Unknown';
  
  const typeMap: Record<string, string> = {
    'flight': 'Flight',
    'train': 'Train',
    'car_service': 'Car Service',
    'shuttle': 'Shuttle',
    'ferry': 'Ferry',
    'rental_car': 'Rental Car'
  };
  
  return typeMap[type] || type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Get icon for transportation type
 */
export const getTransportationIcon = (type: TransportationType | string | null): string => {
  const iconMap: Record<string, string> = {
    'flight': '✈️',
    'train': '🚆',
    'car_service': '🚗',
    'shuttle': '🚐',
    'ferry': '⛴️',
    'rental_car': '🚙'
  };
  
  return iconMap[type || ''] || '🚌';
};

/**
 * Get color class for transportation type
 */
export const getTransportationColor = (type: TransportationType | string | null): string => {
  const colorMap: Record<string, string> = {
    'flight': 'bg-blue-100 text-blue-800',
    'train': 'bg-green-100 text-green-800',
    'car_service': 'bg-gray-100 text-gray-800',
    'shuttle': 'bg-yellow-100 text-yellow-800',
    'ferry': 'bg-cyan-100 text-cyan-800',
    'rental_car': 'bg-purple-100 text-purple-800'
  };
  
  return colorMap[type || ''] || 'bg-gray-100 text-gray-800';
};
