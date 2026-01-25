import React, { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EyeOff, Share2, Users, Calendar, MapPin } from 'lucide-react';
import { format, getYear, parseISO, differenceInDays, isToday, isTomorrow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trip } from '@/types/trip';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/integrations/supabase/client';

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
  const [imageUrl, setImageUrl] = useState(trip.cover_image_url);
  
  // Use either the isShared prop or check if the trip object has isShared property
  const tripIsShared = isShared || trip.isShared;
  const shareCount = trip.shareCount || 0;

  useEffect(() => {
    const loadImage = async () => {
      const src = trip.cover_image_url;
      
      // Check if this is a Supabase storage URL
      if (src && src.includes('supabase.co/storage') && src.includes('trip-images')) {
        // Extract file path and get signed URL if not already signed
        if (!src.includes('token=')) {
          const pathMatch = src.match(/\/storage\/v1\/object\/(?:public|sign)\/trip-images\/(.+?)(?:\?|$)/);
          if (pathMatch) {
            try {
              const { data: { signedUrl }, error } = await supabase.storage
                .from('trip-images')
                .createSignedUrl(pathMatch[1], 31536000); // 1 year
              
              if (!error && signedUrl) {
                setImageUrl(signedUrl);
                return;
              }
            } catch (err) {
              console.error('Error getting signed URL:', err);
            }
          }
        }
      }
      setImageUrl(src);
    };

    loadImage();
  }, [trip.cover_image_url]);

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

  // Calculate trip status and urgency
  const getTripStatus = () => {
    if (!trip.arrival_date || !trip.departure_date) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arrivalDate = parseISO(trip.arrival_date);
    const departureDate = parseISO(trip.departure_date);
    
    if (today >= arrivalDate && today <= departureDate) {
      return { status: 'current', label: 'Traveling Now', color: 'bg-emerald-500' };
    }
    
    if (arrivalDate > today) {
      const daysUntil = differenceInDays(arrivalDate, today);
      if (isToday(arrivalDate)) {
        return { status: 'today', label: 'Departure Today!', color: 'bg-orange-500' };
      } else if (isTomorrow(arrivalDate)) {
        return { status: 'tomorrow', label: 'Tomorrow', color: 'bg-blue-500' };
      } else if (daysUntil <= 7) {
        return { status: 'soon', label: `${daysUntil} days`, color: 'bg-blue-500' };
      } else {
        return { status: 'upcoming', label: `${daysUntil} days`, color: 'bg-gray-500' };
      }
    }
    
    return { status: 'past', label: 'Completed', color: 'bg-gray-400' };
  };

  const tripStatus = getTripStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Card 
        className="overflow-hidden cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white group-hover:shadow-earth-200/25"
        onClick={(e) => {
          // Prevent navigation if the hide button is clicked
          if (e.defaultPrevented) return;
          navigate(`/trip/${trip.trip_id}`);
        }}
      >
        <div className="relative h-56 overflow-hidden">
          <motion.img 
            src={imageUrl}
            alt={trip.destination} 
            className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            whileHover={{ scale: 1.05 }}
          />
          {/* Enhanced gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          {/* Status Badge */}
          {tripStatus && (
            <div className="absolute top-4 left-4">
              <Badge className={`${tripStatus.color} text-white border-0 px-3 py-1 font-medium shadow-lg backdrop-blur-sm`}>
                {tripStatus.label}
              </Badge>
            </div>
          )}
          
          {/* Destination Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between">
              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-1 drop-shadow-lg">
                  {trip.destination}
                </h3>
                {trip.primary_destination && (
                  <div className="flex items-center text-white/80 text-sm font-medium mb-1">
                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                    {trip.primary_destination}
                  </div>
                )}
                <div className="flex items-center text-white/90 text-sm font-medium">
                  <Calendar className="h-4 w-4 mr-2" />
                  {formatDateRange(trip)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Display shared badge in top-right corner with count if owned by user */}
          {!isShared && tripIsShared && shareCount > 0 && (
            <div className="absolute top-4 right-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="flex items-center gap-1 bg-blue-500/90 border-blue-400 text-white backdrop-blur-sm shadow-lg">
                      <Users className="h-3 w-3" />
                      <span>{shareCount}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Shared with {shareCount} {shareCount === 1 ? 'person' : 'people'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
        <CardContent className="p-6 pt-4">
          {/* Shared Trip Badge */}
          {isShared && (
            <div className="mb-4 flex items-center justify-between">
              <Badge variant="outline" className="flex items-center gap-2 border-blue-200 bg-blue-50 text-blue-700 px-3 py-1">
                {trip.owner_name ? (
                  <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
                    {trip.owner_name.split(' ').map(name => name[0]).join('').toUpperCase().substring(0, 2)}
                  </div>
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                <span className="font-medium">Shared by {trip.owner_name || 'Unknown'}</span>
              </Badge>
            </div>
          )}
          
          {/* Trip Details - Now more compact since destination is in overlay */}
          <div className="space-y-3">
            {/* Additional trip info can go here */}
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center text-earth-600 text-sm font-medium">
                <MapPin className="h-4 w-4 mr-2" />
                <span className="text-earth-800">View Details</span>
              </div>
              
              <div className="flex gap-2">
                {!isExample && !isShared && onHide && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <EyeOff className="h-4 w-4" />
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
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default memo(TripCard);
