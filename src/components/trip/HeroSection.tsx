import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import UnsplashImage from '@/components/UnsplashImage';
import { Button } from '@/components/ui/button';
import { PencilIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import ImageSection from '@/components/trip/create/ImageSection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface HeroSectionProps {
  tripId: string;
  title: string;
  imageUrl: string;
  arrivalDate: string | null;
  departureDate: string | null;
  photographer?: string;
  unsplashUsername?: string;
  isLoading?: boolean;
  canEdit?: boolean;
}

interface DateRangeDisplayProps {
  isLoading: boolean;
  formattedDateRange: string | null;
}

/** 
 * Reads the current header height if the header is `position: fixed`.
 * Works on mobile/desktop and updates on resize.
 * Expects the header to have [data-app-nav].
 */
function useNavOffset() {
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const nav = document.querySelector('[data-app-nav]') as HTMLElement | null;

    const compute = () => {
      if (!nav) return setOffset(0);
      const style = window.getComputedStyle(nav);
      const isFixed = style.position === 'fixed';
      setOffset(isFixed ? nav.getBoundingClientRect().height : 0);
    };

    // compute once on mount
    compute();

    // update on resize and on nav size changes
    const ro = nav ? new ResizeObserver(compute) : null;
    if (ro && nav) ro.observe(nav);

    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);

    return () => {
      if (ro && nav) ro.disconnect();
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, []);

  return offset;
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
  canEdit = true,
}) => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

  const [imagePosition, setImagePosition] = useState<string>("center 50%");

  // NEW: ensure hero starts below the fixed header
  const navOffset = useNavOffset();

  const handleImageChange = async (newImageUrl: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ cover_image_url: newImageUrl })
        .eq('trip_id', tripId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      setIsDialogOpen(false);
      toast.success('Cover image updated successfully');
    } catch (error) {
      console.error('Error updating cover image:', error);
      toast.error('Failed to update cover image');
    }
  };

  const handlePositionChange = async (newPosition: string) => {
    setImagePosition(newPosition);
    localStorage.setItem(`trip_image_position_${tripId}`, newPosition);
  };

  const handleTitleSubmit = async () => {
    if (editedTitle.trim() === '') return;

    try {
      const { error } = await supabase
        .from('trips')
        .update({ destination: editedTitle })
        .eq('trip_id', tripId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['trip', tripId] });

      setIsEditing(false);
      toast.success('Destination updated successfully');
    } catch (error) {
      console.error('Error updating destination:', error);
      toast.error('Failed to update destination');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedTitle(title);
    }
  };

  // Keep track of the last valid title for smooth transitions
  const [lastValidTitle, setLastValidTitle] = React.useState(title);
  const [lastValidDates, setLastValidDates] = React.useState({
    arrivalDate,
    departureDate
  });

  React.useEffect(() => {
    if (title && title.trim() !== '') {
      setLastValidTitle(title);
    }
  }, [title]);

  React.useEffect(() => {
    if (arrivalDate && departureDate) {
      setLastValidDates({
        arrivalDate,
        departureDate
      });
    }
  }, [arrivalDate, departureDate]);

  // Load image position from localStorage when component mounts
  React.useEffect(() => {
    const savedPosition = localStorage.getItem(`trip_image_position_${tripId}`);
    if (savedPosition) {
      setImagePosition(savedPosition);
    }
  }, [tripId]);

  const formattedDateRange = React.useMemo(() => {
    const safeArrival = lastValidDates.arrivalDate;
    const safeDeparture = lastValidDates.departureDate;

    if (!safeArrival || !safeDeparture) {
      return null;
    }

    try {
      const start = parseISO(safeArrival);
      const end = parseISO(safeDeparture);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return null;
      }

      const formattedStart = format(start, 'LLL d, yyyy');
      const formattedEnd = format(end, 'LLL d, yyyy');
      return `${formattedStart} - ${formattedEnd}`;
    } catch {
      return null;
    }
  }, [lastValidDates]);

  return (
    <div
      className="relative w-full mb-0"
      // Apply offset only when header is fixed; hook handles that.
      style={{ marginTop: navOffset ? `${navOffset}px` : undefined }}
    >
      <div className="relative aspect-[16/9] md:aspect-[21/9] max-h-[800px] md:max-h-[600px] w-full overflow-hidden rounded-lg rounded-b-none group">
        {canEdit && (
          <div className="absolute bottom-4 right-4 flex space-x-2 z-20">
            <Button
              variant="secondary"
              size="sm"
              className="opacity-50 hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-sm text-sand-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDialogOpen(true);
              }}
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Cover
            </Button>
          </div>
        )}

        <Dialog 
          open={isDialogOpen} 
          onOpenChange={(open) => {
            if (!open && isDialogOpen) {
              setImagePosition(prev => prev);
            }
            setIsDialogOpen(open);
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogTitle>Edit Cover Image</DialogTitle>
            <ImageSection
              coverImageUrl={imageUrl}
              onImageChange={handleImageChange}
              objectPosition={imagePosition}
              onPositionChange={handlePositionChange}
            />
          </DialogContent>
        </Dialog>

        {imageUrl ? (
          <div className="absolute inset-0 w-full h-full">
            <UnsplashImage
              src={imageUrl}
              alt={lastValidTitle}
              className="h-full w-full object-cover"
              photographer={photographer}
              unsplashUsername={unsplashUsername}
              objectPosition={imagePosition}
              showAttribution={false}
            />
          </div>
        ) : (
          <div className="h-full w-full bg-gray-200 animate-pulse"></div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>

        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 md:p-16 text-white z-10">
          {isLoading ? (
            <div className="h-10 w-48 bg-gray-300/30 animate-pulse rounded"></div>
          ) : isEditing ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleTitleSubmit}
                className="text-4xl md:text-5xl font-bold bg-black/20 text-white rounded px-2 py-1 backdrop-blur-sm"
                autoFocus
              />
            </div>
          ) : (
            <div className="group relative inline-block">
              <h1 
                className={`text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg text-center ${canEdit ? 'cursor-pointer' : ''}`} 
                onClick={canEdit ? () => setIsEditing(true) : undefined}
              >
                {lastValidTitle}
              </h1>
              {canEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsEditing(true)}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

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
