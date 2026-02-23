import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import UnsplashImage from '@/components/UnsplashImage';
import { Button } from '@/components/ui/button';
import { PencilIcon, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ImageSection, { ImageMetadata } from '@/components/trip/create/ImageSection';
import PrimaryDestinationInput from '@/components/trip/create/PrimaryDestinationInput';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { motion, useScroll, useTransform } from 'framer-motion';

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
  primaryDestination?: string | null;
  primaryDestinationPlaceId?: string | null;
  coverImagePosition?: string | null;
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
    return <div className="h-6 w-64 bg-sand-300/30 animate-pulse rounded"></div>;
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
  primaryDestination,
  primaryDestinationPlaceId,
  coverImagePosition,
}) => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for the edit modal
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedPrimaryDestination, setEditedPrimaryDestination] = useState(primaryDestination || '');
  const [editedPrimaryDestinationPlaceId, setEditedPrimaryDestinationPlaceId] = useState(primaryDestinationPlaceId || '');
  const [editedImageUrl, setEditedImageUrl] = useState(imageUrl);
  const [editedPhotographer, setEditedPhotographer] = useState(photographer || '');
  const [editedPhotographerUsername, setEditedPhotographerUsername] = useState(unsplashUsername || '');

  const [imagePosition, setImagePosition] = useState<string>(() => {
    if (coverImagePosition && coverImagePosition !== 'center 50%') return coverImagePosition;
    const saved = localStorage.getItem(`trip_image_position_${tripId}`);
    return saved || coverImagePosition || 'center 50%';
  });

  // Reset form state when dialog opens
  const handleOpenDialog = () => {
    setEditedTitle(title);
    setEditedPrimaryDestination(primaryDestination || '');
    setEditedPrimaryDestinationPlaceId(primaryDestinationPlaceId || '');
    setEditedImageUrl(imageUrl);
    setEditedPhotographer(photographer || '');
    setEditedPhotographerUsername(unsplashUsername || '');
    setIsDialogOpen(true);
  };

  // Handle closing dialog without saving
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    // Reset form state to original values
    setEditedTitle(title);
    setEditedPrimaryDestination(primaryDestination || '');
    setEditedPrimaryDestinationPlaceId(primaryDestinationPlaceId || '');
    setEditedImageUrl(imageUrl);
    setEditedPhotographer(photographer || '');
    setEditedPhotographerUsername(unsplashUsername || '');
  };

  const handleImageChange = (newImageUrl: string, metadata?: ImageMetadata) => {
    setEditedImageUrl(newImageUrl);
    setEditedPhotographer(metadata?.photographer || '');
    setEditedPhotographerUsername(metadata?.username || '');
  };

  const handlePositionChange = (newPosition: string) => {
    setImagePosition(newPosition);
  };

  const handlePrimaryDestinationChange = (destination: string, placeId: string) => {
    setEditedPrimaryDestination(destination);
    setEditedPrimaryDestinationPlaceId(placeId);
  };

  // Save all changes at once
  const handleSaveChanges = async () => {
    if (editedTitle.trim() === '') {
      toast.error('Trip name is required');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .update({
          destination: editedTitle,
          cover_image_url: editedImageUrl,
          cover_image_photographer: editedPhotographer || null,
          cover_image_photographer_username: editedPhotographerUsername || null,
          primary_destination: editedPrimaryDestination || null,
          primary_destination_place_id: editedPrimaryDestinationPlaceId || null,
          cover_image_position: imagePosition,
        } as any)
        .eq('trip_id', tripId)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('Unable to save changes. You may not have edit permission for this trip.');
        return;
      }

      // Clean up legacy localStorage entry
      localStorage.removeItem(`trip_image_position_${tripId}`);

      await queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error updating trip details:', error);
      toast.error('Failed to update trip details');
    } finally {
      setIsSaving(false);
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

  // Parallax scroll: fade out hero text as user scrolls down
  const { scrollY } = useScroll();
  const heroTextOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroTextY = useTransform(scrollY, [0, 400], [0, -40]);

  return (
    <>
      {/* Fixed hero background — purely visual, no interaction */}
      <div
        className="fixed overflow-hidden w-full z-0 pointer-events-none bg-grain"
        style={{
          top: 'var(--app-nav-h, 56px)',
          left: 'var(--hero-left, 0)',
          width: 'var(--hero-width, 100%)',
          height: 'calc(100dvh - var(--app-nav-h, 56px) - 80px)',
          maxHeight: '70vh',
          minHeight: '280px',
        }}
      >
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
          <div className="h-full w-full bg-sand-200 animate-pulse"></div>
        )}

        {/* Gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-black/10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-sand-50/30"></div>

        {/* Unsplash attribution — above gradient overlays */}
        {photographer && unsplashUsername && (
          <div className="absolute bottom-3 right-3 z-10 text-white text-xs bg-black/40 px-2 py-1 rounded backdrop-blur-sm opacity-60 hover:opacity-100 transition-opacity pointer-events-auto">
            <a
              href={`https://unsplash.com/@${unsplashUsername}?utm_source=wanderluxe&utm_medium=referral`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {photographer}
            </a>
            {' / '}
            <a
              href="https://unsplash.com?utm_source=wanderluxe&utm_medium=referral"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Unsplash
            </a>
          </div>
        )}
      </div>

      {/* Spacer — pushes content down + holds interactive hero text */}
      <div
        className="relative w-full"
        style={{
          height: 'calc(100dvh - var(--app-nav-h, 56px) - 80px)',
          maxHeight: '70vh',
          minHeight: '280px',
        }}
      >
        {/* Hero text content — fades out as user scrolls */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center p-10 md:p-16 text-white"
          style={{
            top: 'var(--app-nav-h, 56px)',
            opacity: heroTextOpacity,
            y: heroTextY,
          }}
        >
          {isLoading ? (
            <div className="h-10 w-48 bg-sand-300/30 animate-pulse rounded"></div>
          ) : (
            <div className="flex items-baseline gap-2 justify-center mb-4">
              <h1
                className={`text-4xl md:text-5xl lg:text-6xl font-bold drop-shadow-lg text-center tracking-tight ${canEdit ? 'cursor-pointer hover:text-white/90' : ''}`}
                onClick={canEdit ? handleOpenDialog : undefined}
              >
                {lastValidTitle}
              </h1>
              {canEdit && (
                <button
                  className="opacity-60 hover:opacity-100 transition-opacity text-white shrink-0 translate-y-[-0.1em]"
                  onClick={handleOpenDialog}
                >
                  <PencilIcon className="h-5 w-5 md:h-6 md:w-6 drop-shadow-md" />
                </button>
              )}
            </div>
          )}

          {primaryDestination ? (
            <div className="mb-2">
              <p
                className={`text-lg md:text-xl font-medium drop-shadow-md text-center flex items-center gap-2 justify-center ${canEdit ? 'cursor-pointer hover:text-white/80' : ''}`}
                onClick={canEdit ? handleOpenDialog : undefined}
              >
                <MapPin className="h-4 w-4" />
                {primaryDestination}
              </p>
            </div>
          ) : canEdit && !isLoading ? (
            <button
              className="text-sm text-white/70 hover:text-white mb-2 flex items-center gap-1 transition-colors"
              onClick={handleOpenDialog}
            >
              <MapPin className="h-3 w-3" />
              Add primary destination
            </button>
          ) : null}

          <DateRangeDisplay
            isLoading={isLoading}
            formattedDateRange={formattedDateRange}
          />
        </motion.div>
      </div>

      {/* Edit Trip Details Dialog — outside the fixed layer so it renders correctly */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDialog();
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogTitle>Edit Trip Details</DialogTitle>
          <div className="space-y-6 pt-2">
            {/* Trip Name */}
            <div className="space-y-3">
              <Label htmlFor="tripName" className="text-earth-700 font-semibold">
                Trip name<span className="text-red-500"> *</span>
              </Label>
              <Input
                id="tripName"
                placeholder="e.g., NYE in Paris"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="bg-white/70 border-earth-200 focus:border-earth-400 focus:ring-earth-400 rounded-xl py-3 px-4 shadow-sm"
              />
            </div>

            {/* Primary Destination */}
            <PrimaryDestinationInput
              value={editedPrimaryDestination}
              placeId={editedPrimaryDestinationPlaceId}
              onChange={handlePrimaryDestinationChange}
              placeholder="Search for a city..."
            />

            {/* Cover Image */}
            <ImageSection
              coverImageUrl={editedImageUrl}
              onImageChange={handleImageChange}
              objectPosition={imagePosition}
              onPositionChange={handlePositionChange}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-earth-100">
              <Button
                variant="ghost"
                onClick={handleCloseDialog}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                className="bg-earth-600 hover:bg-earth-700 text-white"
                onClick={handleSaveChanges}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HeroSection;
