// utils/timeline.ts
import React from 'react';
import { Plane, Train, Car, Bus, Ship, Hotel as HotelIcon, MapPin, Utensils, Clock } from 'lucide-react';
import { DayActivity, HotelStay, RestaurantReservation, Transportation } from '@/types/trip';

// ----- Types -----
export type TimelineType = 'activity' | 'hotel' | 'transportation' | 'dining' | 'layover';

export interface TimelineItem {
  type: TimelineType;
  time?: string;
  endTime?: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  id: string;
  data?: any;
}

// ----- Small time/format helpers -----
export const formatTime12 = (time?: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const getNormalizedDay = (date: string) => date.split('T')[0];

const combineDateAndTime = (dateISO: string, time?: string) => {
  if (!time) return null;
  return new Date(`${dateISO}T${time}:00`);
};

const extractIata = (loc?: string) => {
  if (!loc) return '';
  const m = loc.match(/\b([A-Z]{3})\b/);
  return m ? m[1] : loc;
};

const diffMinutes = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
const humanizeMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

// ----- Icons / colors -----
export const getTransportationIconComponent = (type: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    flight: <Plane className="h-3 w-3" />,
    train: <Train className="h-3 w-3" />,
    car_service: <Car className="h-3 w-3" />,
    shuttle: <Bus className="h-3 w-3" />,
    ferry: <Ship className="h-3 w-3" />,
    rental_car: <Car className="h-3 w-3" />,
  };
  return iconMap[type] || <Bus className="h-3 w-3" />;
};

export const getEventColors = (_type: TimelineType) => {
  return { node: 'bg-earth-400', line: 'bg-earth-200', icon: 'text-earth-600' };
};
