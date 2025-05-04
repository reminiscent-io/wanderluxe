import React from 'react';
import { motion } from 'framer-motion';
import { EyeOff } from 'lucide-react';
import { format, getYear, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trip } from '@/types/trip';

interface TripCardProps {
  trip: Trip;
  isExample?: boolean;
  onHide: (tripId: string) => void;
}

const TripCard = ({
  trip,
  isExample = false,
  onHide
}: TripCardProps) => {
  const navigate = useNavigate();

  const formatDateRange = (trip: Trip) => {
    // If arrival and departure dates are available, use those
    if (trip.arrival_date && trip.departure_date) {
      const arrivalDate = parseISO(trip.arrival_date);
      const departureDate = parseISO(trip.departure_date);
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
    return ''; // Return empty string if no dates available
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className="hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
        onClick={(e) => {
          // Prevent navigation if the hide button is clicked
          if (e.defaultPrevented) return;
          navigate(`/trip/${trip.trip_id}`);
        }}
      >
        <div className="relative h-48">
          <img 
            src={trip.cover_image_url}
            alt={trip.destination} 
            className="w-full h-full object-cover object-center"
          />
          {/* Updated overlay to match hero section style */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-grow">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  {trip.destination}
                </h3>
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onHide(trip.trip_id);
                    }}
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
                    <AlertDialogAction onClick={() => onHide(trip.trip_id)} className="bg-gray-600 hover:bg-gray-700 text-sand-50">
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
