import React, { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Share2, Users, Calendar, MapPin, LogOut, Check, X } from 'lucide-react';
import { format, getYear, parseISO, differenceInDays, isToday, isTomorrow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trip } from '@/types/trip';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/integrations/supabase/client';
import { useWeather, getWeatherForDate, getWeatherEmoji } from '@/hooks/useWeather';

async function resolveSupabaseSignedUrl(src: string): Promise<string | null> {
  const pathMatch = src.match(/\/storage\/v1\/object\/(?:public|sign)\/trip-images\/(.+?)(?:\?|$)/);
  if (!pathMatch) return null;
  try {
    const { data: { signedUrl }, error } = await supabase.storage
      .from('trip-images')
      .createSignedUrl(pathMatch[1], 31536000);
    if (!error && signedUrl) return signedUrl;
  } catch (err) {
    console.error('Error getting signed URL:', err);
  }
  return null;
}

type TripStatus = { status: string; label: string; color: string };

function computeTripStatus(arrivalDate?: string, departureDate?: string): TripStatus | null {
  if (!arrivalDate || !departureDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const arrival = parseISO(arrivalDate);
  const departure = parseISO(departureDate);

  if (today >= arrival && today <= departure) {
    return { status: 'current', label: 'Traveling Now', color: 'bg-emerald-500' };
  }

  if (arrival <= today) {
    return { status: 'past', label: 'Completed', color: 'bg-sand-400' };
  }

  if (isToday(arrival)) {
    return { status: 'today', label: 'Departure Today!', color: 'bg-orange-500' };
  }

  if (isTomorrow(arrival)) {
    return { status: 'tomorrow', label: 'Tomorrow', color: 'bg-blue-500' };
  }

  const daysUntil = differenceInDays(arrival, today);
  if (daysUntil <= 7) {
    return { status: 'soon', label: `${daysUntil} days`, color: 'bg-blue-500' };
  }

  return { status: 'upcoming', label: `${daysUntil} days`, color: 'bg-earth-500' };
}

interface TripCardProps {
  trip: Trip & { 
    isShared?: boolean; 
    shareId?: string;
    share_status?: 'pending' | 'accepted';
    sharedById?: string;
    shareCount?: number;
    owner_name?: string;
    owner_email?: string;
  };
  isExample?: boolean;
  onDelete?: (tripId: string) => void;
  onAcceptInvite?: (shareId: string) => void;
  onLeaveSharedTrip?: (shareId: string) => void;
  isShared?: boolean;
}

const TripCard = ({
  trip,
  isExample = false,
  onDelete,
  onAcceptInvite,
  onLeaveSharedTrip,
  isShared
}: TripCardProps) => {
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState(trip.cover_image_url);

  // Use either the isShared prop or check if the trip object has isShared property
  const tripIsShared = isShared || trip.isShared;
  const shareCount = trip.shareCount || 0;
  const canLeaveSharedTrip = !!isShared && !!trip.shareId && !!onLeaveSharedTrip;
  const isPendingInvite = !!isShared && trip.share_status === 'pending';
  const canAcceptInvite = isPendingInvite && !!trip.shareId && !!onAcceptInvite;

  // Check if trip starts within 5 days (forecast window)
  const daysUntilTrip = trip.arrival_date
    ? differenceInDays(parseISO(trip.arrival_date), new Date())
    : null;
  const showWeather = daysUntilTrip !== null && daysUntilTrip >= 0 && daysUntilTrip <= 5;

  // Fetch weather for upcoming trips within forecast window
  const weatherLocation = trip.primary_destination || trip.destination;
  const { data: weather } = useWeather(showWeather && !isExample ? weatherLocation : undefined);

  // Get forecast for arrival date
  const arrivalDateStr = trip.arrival_date?.split('T')[0];
  const arrivalForecast = arrivalDateStr ? getWeatherForDate(weather, arrivalDateStr) : undefined;

  useEffect(() => {
    const loadImage = async () => {
      const src = trip.cover_image_url;
      if (src && src.includes('supabase.co/storage') && src.includes('trip-images') && !src.includes('token=')) {
        const signed = await resolveSupabaseSignedUrl(src);
        if (signed) {
          setImageUrl(signed);
          return;
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

  const tripStatus = computeTripStatus(trip.arrival_date, trip.departure_date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Card 
        className="overflow-hidden cursor-pointer border-0 shadow-warm-lg hover:shadow-warm-xl transition-all duration-300 bg-background group-hover:shadow-earth-200/25"
        onClick={(e) => {
          // Prevent navigation if the hide button is clicked
          if (e.defaultPrevented) return;
          // For pending invites, require Accept/Decline first
          if (isPendingInvite) return;
          navigate(`/trip/${trip.trip_id}`);
        }}
      >
        <div className="relative h-56 overflow-hidden">
          <motion.img 
            src={imageUrl}
            alt={trip.destination} 
            className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105 img-warm"
            whileHover={{ scale: 1.05 }}
          />
          {/* Enhanced gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          {/* Status Badge */}
          {tripStatus && (
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              <Badge className={`${tripStatus.color} text-white border-0 px-3 py-1 font-medium shadow-lg backdrop-blur-sm`}>
                {tripStatus.label}
              </Badge>
              {/* Weather Forecast Badge for upcoming trips */}
              {arrivalForecast && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="bg-white/90 text-earth-800 border-0 px-2 py-1 font-medium shadow-lg backdrop-blur-sm">
                        {getWeatherEmoji(arrivalForecast.icon)} {arrivalForecast.tempHigh}°/{arrivalForecast.tempLow}°
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="capitalize">{arrivalForecast.description}</p>
                      <p>Forecast for arrival day</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
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
          
          {/* Display shared badge in top-right corner */}
          <div className="absolute top-4 right-4">
            {/* Show "Shared by" badge for trips shared with user */}
            {isShared && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="flex items-center gap-1.5 bg-white/95 text-earth-700 border-0 backdrop-blur-sm shadow-lg px-2.5 py-1">
                      <Share2 className="h-3 w-3 text-blue-600" />
                      <span className="font-medium text-xs">
                        {trip.owner_name || 'Shared'}
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Shared by {trip.owner_name || 'someone'}</p>
                    {trip.owner_email && <p className="text-xs opacity-75">{trip.owner_email}</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Show share count for trips user owns and has shared */}
            {!isShared && tripIsShared && shareCount > 0 && (
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
            )}
          </div>

          {/* Pending invite badge */}
          {isPendingInvite && (
            <div className="absolute bottom-4 right-4">
              <Badge className="bg-amber-500 text-white border-0 px-3 py-1 font-medium shadow-lg backdrop-blur-sm">
                Invite pending
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-6 pt-4">
          {/* Trip Details - Now more compact since destination is in overlay */}
          <div className="space-y-3">
            {/* Additional trip info can go here */}
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center text-earth-600 text-sm font-medium">
                <MapPin className="h-4 w-4 mr-2" />
                <span className="text-earth-800">{isPendingInvite ? 'Accept to view details' : 'View Details'}</span>
              </div>
              
              <div className="flex gap-2">
                {!isExample && canAcceptInvite && (
                  <>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAcceptInvite?.(trip.shareId!);
                      }}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Decline this trip?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure? If you decline, this shared trip will disappear from your list and you’ll lose access.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onLeaveSharedTrip?.(trip.shareId!)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Yes, decline
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}

                {!isExample && !isShared && onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Trip</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the trip from your list and revoke access for anyone it was shared with. You can restore it later from hidden trips.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(trip.trip_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {!isExample && canLeaveSharedTrip && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        aria-label="Leave shared trip"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Leave this trip?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You'll lose access to this shared trip. You can be re-invited by the trip owner later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onLeaveSharedTrip?.(trip.shareId!)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Leave trip
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
