import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import UnsplashImage from '@/components/UnsplashImage';
import { Button } from '@/components/ui/button';
import { PencilIcon, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ImageSection from '@/components/trip/create/ImageSection';
import PrimaryDestinationInput from '@/components/trip/create/PrimaryDestinationInput';
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
  primaryDestination?: string | null;
  primaryDestinationPlaceId?: string | null;
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
  canEdit = true,
  primaryDestination,
  primaryDestinationPlaceId,
}) => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for the edit modal
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedPrimaryDestination, setEditedPrimaryDestination] = useState(primaryDestination || '');
  const [editedPrimaryDestinationPlaceId, setEditedPrimaryDestinationPlaceId] = useState(primaryDestinationPlaceId || '');
  const [editedImageUrl, setEditedImageUrl] = useState(imageUrl);

  const [imagePosition, setImagePosition] = useState<string>("center 50%");

  // Reset form state when dialog opens
  const handleOpenDialog = () => {
    setEditedTitle(title);
    setEditedPrimaryDestination(primaryDestination || '');
    setEditedPrimaryDestinationPlaceId(primaryDestinationPlaceId || '');
    setEditedImageUrl(imageUrl);
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
  };

  const handleImageChange = (newImageUrl: string) => {
    setEditedImageUrl(newImageUrl);
  };

  const handlePositionChange = (newPosition: string) => {
    setImagePosition(newPosition);
    localStorage.setItem(`trip_image_position_${tripId}`, newPosition);
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
      const { error } = await supabase
        .from('trips')
        .update({
          destination: editedTitle,
          cover_image_url: editedImageUrl,
          primary_destination: editedPrimaryDestination || null,
          primary_destination_place_id: editedPrimaryDestinationPlaceId || null
        })
        .eq('trip_id', tripId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      setIsDialogOpen(false);
      toast.success('Trip details updated successfully');
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
    >
      <div className="relative aspect-[16/9] md:aspect-[21/9] max-h-[800px] md:max-h-[600px] w-full overflow-hidden group rounded-none">
        {canEdit && (
          <div className="absolute bottom-4 right-4 flex space-x-2 z-20">
            <Button
              variant="secondary"
              size="sm"
              className="opacity-50 hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-sm text-sand-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenDialog();
              }}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Edit Trip Details Dialog */}
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
          ) : (
            <div className="group relative inline-block">
              <h1
                className={`text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg text-center ${canEdit ? 'cursor-pointer hover:text-white/90' : ''}`}
                onClick={canEdit ? handleOpenDialog : undefined}
              >
                {lastValidTitle}
              </h1>
              {canEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleOpenDialog}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {primaryDestination ? (
            <div className="group/dest relative mb-2">
              <p
                className={`text-lg md:text-xl font-medium drop-shadow-md text-center flex items-center gap-2 justify-center ${canEdit ? 'cursor-pointer hover:text-white/80' : ''}`}
                onClick={canEdit ? handleOpenDialog : undefined}
              >
                <MapPin className="h-4 w-4" />
                {primaryDestination}
              </p>
              {canEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover/dest:opacity-100 transition-opacity h-6 w-6 p-0"
                  onClick={handleOpenDialog}
                >
                  <PencilIcon className="h-3 w-3" />
                </Button>
              )}
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
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
