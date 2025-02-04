import React from 'react';
import { motion } from 'framer-motion';
import { EyeOff, Info } from 'lucide-react';
import { format, getYear } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tables } from '@/integrations/supabase/types';

type Trip = Tables<'trips'> & {
  timeline_events: { date: string }[];
};

interface TripCardProps {
  trip: Trip;
  isExample?: boolean;
  onHide: (tripId: string) => void;
}

const TripCard = ({ trip, isExample = false, onHide }: TripCardProps) => {
  const navigate = useNavigate();

  const formatDateRange = (trip: Trip) => {
    // If arrival and departure dates are available, use those
    if (trip.arrival_date && trip.departure_date) {
      const arrivalDate = new Date(trip.arrival_date);
      const departureDate = new Date(trip.departure_date);
      const startYear = getYear(arrivalDate);
      const endYear = getYear(departureDate);

      const formatDate = (date: Date, includeYear: boolean) => {
        const day = format(date, "do");
        const month = format(date, "MMMM");
        return includeYear ? `${month} ${day} ${format(date, "yyyy")}` : `${month} ${day}`;
      };

      if (startYear === endYear) {
        return `${formatDate(arrivalDate, false)} - ${formatDate(departureDate, true)}`;
      }
      return `${formatDate(arrivalDate, true)} - ${formatDate(departureDate, true)}`;
    }

    // Fallback to start_date and end_date if arrival/departure dates aren't available
    const startDate = new Date(trip.start_date);
    let endDate = startDate;

    if (trip.timeline_events && trip.timeline_events.length > 0) {
      const lastEvent = trip.timeline_events[trip.timeline_events.length - 1];
      endDate = new Date(lastEvent.date);
    }

    const startYear = getYear(startDate);
    const endYear = getYear(endDate);

    const formatDate = (date: Date, includeYear: boolean) => {
      const day = format(date, "do");
      const month = format(date, "MMMM");
      return includeYear ? `${month} ${day} ${format(date, "yyyy")}` : `${month} ${day}`;
    };

    if (startYear === endYear) {
      return `${formatDate(startDate, false)} - ${formatDate(endDate, true)}`;
    }
    return `${formatDate(startDate, true)} - ${formatDate(endDate, true)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-shadow overflow-hidden">
        <div className="relative h-48">
          <img 
            src={trip.cover_image_url || 'https://images.unsplash.com/photo-1501854140801-50d01698950b'}
            alt={trip.destination}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div 
              className="cursor-pointer flex-grow"
              onClick={() => navigate(`/trip/${trip.id}`)}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  {trip.destination}
                </h3>
                {isExample && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-5 w-5 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Example Trip
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {formatDateRange(trip)}
              </p>
            </div>
            
            {!isExample && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-500 hover:text-gray-600"
                  >
                    <EyeOff className="h-5 w-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hide Trip</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to hide this trip? You won't be able to see it in your trips list anymore.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onHide(trip.id)}
                      className="bg-gray-600 hover:bg-gray-700"
                    >
                      Hide
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TripCard;