
import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import UnsplashImage from '@/components/UnsplashImage';
import { Button } from '@/components/ui/button';
import { PencilIcon } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ImageSection from '@/components/trip/create/ImageSection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HeroSectionProps {
  tripId: string;
  title: string;
  imageUrl: string;
  arrivalDate: string | null;
  departureDate: string | null;
  photographer?: string;
  unsplashUsername?: string;
  isLoading?: boolean;
}

interface DateRangeDisplayProps {
  isLoading: boolean;
  formattedDateRange: string | null;
}

const DateRangeDisplay: React.FC<DateRangeDisplayProps> = ({
  isLoading,
  formattedDateRange
}) => {
  if (isLoading) {
    return <div className="h-6 w-64 bg-gray-300/30 animate-pulse rounded"></div>;
  }

  if (formattedDateRange) {
    return <p className="text-lg md:text-xl font-medium drop-shadow-md text-center">{formattedDateRange}</p>;
  }

  return <p className="text-lg md:text-xl font-medium drop-shadow-md opacity-75 text-center">Dates not set</p>;
};

const HeroSection: React.FC<HeroSectionProps> = ({
  tripId,
  title,
  imageUrl,
  arrivalDate,
  departureDate,
  photographer,
  unsplashUsername,
  isLoading = false,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleImageChange = async (newImageUrl: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ cover_image_url: newImageUrl })
        .eq('trip_id', tripId);

      if (error) throw error;
      setIsDialogOpen(false);
      toast.success('Cover image updated successfully');
    } catch (error) {
      console.error('Error updating cover image:', error);
      toast.error('Failed to update cover image');
    }
  };
  // Keep track of the last valid title for smooth transitions
  const [lastValidTitle, setLastValidTitle] = React.useState(title);
  const [lastValidDates, setLastValidDates] = React.useState({
    arrivalDate,
    departureDate
  });

  // Update last valid title when a new valid title is received
  React.useEffect(() => {
    if (title && title.trim() !== '') {
      setLastValidTitle(title);
    }
  }, [title]);

  // Update last valid dates when new valid dates are received
  React.useEffect(() => {
    if (arrivalDate && departureDate) {
      setLastValidDates({
        arrivalDate,
        departureDate
      });
    }
  }, [arrivalDate, departureDate]);

  // Compute formatted date range using the last valid dates
  const formattedDateRange = React.useMemo(() => {
    const safeArrival = lastValidDates.arrivalDate;
    const safeDeparture = lastValidDates.departureDate;

    if (!safeArrival || !safeDeparture) {
      console.log('Missing or invalid date information for formatting', { arrivalDate: safeArrival, departureDate: safeDeparture });
      return null;
    }

    try {
      const start = parseISO(safeArrival);
      const end = parseISO(safeDeparture);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.log('Invalid date objects after parsing');
        return null;
      }

      const formattedStart = format(start, 'LLL d, yyyy');
      const formattedEnd = format(end, 'LLL d, yyyy');
      return `${formattedStart} - ${formattedEnd}`;
    } catch (error) {
      console.error('Error formatting dates:', error);
      return null;
    }
  }, [lastValidDates]);

  console.log('HeroSection rendering with:', { formattedDateRange });

  return (
    <div className="relative w-full mb-0">
      <div className="relative aspect-[16/9] md:aspect-[21/9] max-h-[800px] md:max-h-[600px] w-full overflow-hidden rounded-lg rounded-b-none group">
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDialogOpen(true);
          }}
        >
          <PencilIcon className="h-4 w-4 mr-2" />
          Edit Cover
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <ImageSection
              coverImageUrl={imageUrl}
              onImageChange={handleImageChange}
            />
          </DialogContent>
        </Dialog>
        {imageUrl ? (
          <UnsplashImage
            src={imageUrl}
            alt={lastValidTitle}
            className="h-full w-full object-cover"
            photographer={photographer}
            unsplashUsername={unsplashUsername}
          />
        ) : (
          <div className="h-full w-full bg-gray-200 animate-pulse"></div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

        {/* Title and date overlay - centered */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 md:p-16 text-white z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg text-center">
            {isLoading ? (
              <div className="h-10 w-48 bg-gray-300/30 animate-pulse rounded"></div>
            ) : (
              lastValidTitle
            )}
          </h1>

          <DateRangeDisplay 
            isLoading={isLoading}
            formattedDateRange={formattedDateRange}
          />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
