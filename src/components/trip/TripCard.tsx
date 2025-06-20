import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { EyeOff, Share2, Users } from 'lucide-react';
import { format, getYear, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trip } from '@/types/trip';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TripCardProps {
  trip: Trip & { 
    isShared?: boolean; 
    sharedById?: string;
    shareCount?: number;
    owner_name?: string;
    owner_email?: string;
  };
  isExample?: boolean;
  onHide?: (tripId: string) => void;
  isShared?: boolean;
}

const TripCard = ({
  trip,
  isExample = false,
  onHide,
  isShared
}: TripCardProps) => {
  const navigate = useNavigate();
  
  // Use either the isShared prop or check if the trip object has isShared property
  const tripIsShared = isShared || trip.isShared;
  const shareCount = trip.shareCount || 0;

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
          
          {/* Display shared badge in top-right corner with count if owned by user */}
          {!isShared && tripIsShared && shareCount > 0 && (
            <div className="absolute top-3 right-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="flex items-center gap-1 bg-blue-500/80 border-blue-400 text-white backdrop-blur-sm">
                      <Users className="h-3 w-3" />
                      <span>Shared with {shareCount}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This trip is shared with {shareCount} {shareCount === 1 ? 'person' : 'people'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-grow">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  {trip.destination}
                </h3>
                {isShared && (
                  <Badge variant="outline" className="flex items-center gap-1 border-blue-400 text-blue-500">
                    {trip.owner_name ? (
                      <div className="h-5 w-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                        {trip.owner_name.split(' ').map(name => name[0]).join('').toUpperCase().substring(0, 2)}
                      </div>
                    ) : (
                      <Users className="h-3 w-3" />
                    )}
                    <span>Shared with me</span>
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {formatDateRange(trip)}
              </p>
            </div>
            
            {!isExample && !isShared && onHide && (
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
            
            {isShared && (
              <div className="flex items-center">
                <Share2 className="h-5 w-5 text-blue-500" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default memo(TripCard);
