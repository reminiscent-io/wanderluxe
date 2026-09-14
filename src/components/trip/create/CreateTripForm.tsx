import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageSection, { ImageMetadata } from "./ImageSection";
import TimingSection from "./TimingSection";
import PrimaryDestinationInput from "./PrimaryDestinationInput";
import { supabase } from '@/integrations/supabase/client';
import { useResolveTimezone } from '@/hooks/useResolveTimezone';
import { generateDateArray } from '../../../utils/dateUtils';
import { createTripDays } from '@/services/tripDaysService';
import { addOwnerToTripShares } from '@/services/travelers';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, MapPin, CalendarDays, Camera, Loader2 } from 'lucide-react';

interface CreateTripFormProps {
  onSubmit: (tripId: string) => void;
  onCancel: () => void;
}

// Destination, dates, photo. The trip is named after its destination and can
// be renamed later; asking for a name up front was a step with a placeholder
// that already held the right answer.
const TOTAL_STEPS = 3;

const stepConfig = [
  { icon: MapPin, label: 'Destination' },
  { icon: CalendarDays, label: 'Dates' },
  { icon: Camera, label: 'Photo' },
];

/** "Paris, France" → "Paris"; the trip name people would have typed anyway. */
function defaultTripName(destination: string): string {
  return destination.split(',')[0]?.trim() || destination.trim();
}

const CreateTripForm: React.FC<CreateTripFormProps> = ({ onSubmit, onCancel }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Form state
  const [primaryDestination, setPrimaryDestination] = useState('');
  const [primaryDestinationPlaceId, setPrimaryDestinationPlaceId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [imagePosition, setImagePosition] = useState('center 50%');
  const [photographerName, setPhotographerName] = useState('');
  const [photographerUsername, setPhotographerUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // True once the user picked or searched a photo themselves, so the
  // destination autofill never overwrites a deliberate choice.
  const [coverChosenByUser, setCoverChosenByUser] = useState(false);

  // Resolve the timezone in the background from the chosen place. Soft-fails
  // to null; useTripTimezone self-heals later if it is missing.
  const { timeZoneId } = useResolveTimezone(primaryDestinationPlaceId || null);

  const handlePrimaryDestinationChange = useCallback((destination: string, placeId: string) => {
    setPrimaryDestination(destination);
    setPrimaryDestinationPlaceId(placeId);
  }, []);

  // Fetch a cover photo for the place as soon as it is chosen, so the photo
  // step opens already filled and can simply be skipped.
  useEffect(() => {
    const city = defaultTripName(primaryDestination);
    if (!city || coverChosenByUser) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { keywords: city },
        });
        if (error || cancelled) return;
        const hit = data?.images?.[0] as { url?: string; photographer?: string; username?: string; id?: string } | undefined;
        if (!hit?.url) return;
        setCoverImageUrl(hit.url);
        setPhotographerName(hit.photographer || '');
        setPhotographerUsername(hit.username || '');
        if (hit.id) void supabase.functions.invoke('fetch-unsplash-metadata', { body: { photoId: hit.id } });
      } catch {
        /* a missing cover is not worth interrupting the flow */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [primaryDestination, coverChosenByUser]);

  const handleImageChange = useCallback((url: string, metadata?: ImageMetadata) => {
    setCoverChosenByUser(true);
    setCoverImageUrl(url);
    setPhotographerName(metadata?.photographer || '');
    setPhotographerUsername(metadata?.username || '');
  }, []);

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return primaryDestination.trim().length > 0;
      // A day trip is a trip: same-day start and end is allowed.
      case 1: return !!startDate && !!endDate && new Date(startDate) <= new Date(endDate);
      case 2: return true; // Photo is optional
      default: return false;
    }
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep(s => s + 1);
    } else {
      handleSubmit();
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(s => s - 1);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canProceed() && !isSubmitting) {
      e.preventDefault();
      goNext();
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert([{
          user_id: user.id,
          destination: defaultTripName(primaryDestination),
          arrival_date: startDate,
          departure_date: endDate,
          cover_image_url: coverImageUrl || null,
          cover_image_position: imagePosition || 'center 50%',
          cover_image_photographer: photographerName || null,
          cover_image_photographer_username: photographerUsername || null,
          is_public: false,
          primary_destination: primaryDestination || null,
          primary_destination_place_id: primaryDestinationPlaceId || null,
          timezone: timeZoneId || null,
        }])
        .select('trip_id')
        .single();

      if (tripError) throw tripError;

      if (trip) {
        await addOwnerToTripShares(trip.trip_id, user.id);
        const days = generateDateArray(startDate, endDate);
        await createTripDays(trip.trip_id, days);
        track('trip_created', {
          trip_id: trip.trip_id,
          destination: primaryDestination || null,
          duration_days: days.length,
          has_cover_image: Boolean(coverImageUrl),
        });
        onSubmit(trip.trip_id);
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="w-full" onKeyDown={handleKeyDown}>
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {stepConfig.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isCompleted = i < step;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (i < step) {
                  setDirection(i < step ? -1 : 1);
                  setStep(i);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-earth-600 text-white shadow-warm-sm scale-105'
                  : isCompleted
                    ? 'bg-earth-100 text-earth-700 cursor-pointer hover:bg-earth-200'
                    : 'bg-sand-100 text-sand-400 cursor-default'
              }`}
              disabled={i > step}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[280px] flex flex-col">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1"
          >
            {step === 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-display text-earth-900 mb-2">
                    Where are you going?
                  </h2>
                  <p className="text-earth-500 text-sm">
                    Search for a city or destination
                  </p>
                </div>
                <PrimaryDestinationInput
                  value={primaryDestination}
                  placeId={primaryDestinationPlaceId}
                  onChange={handlePrimaryDestinationChange}
                  showLabel={false}
                  autoFocus
                  placeholder="e.g., Paris, Tokyo, Amalfi Coast..."
                  inputClassName="text-center text-lg py-4"
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-display text-earth-900 mb-2">
                    When are you traveling?
                  </h2>
                  <p className="text-earth-500 text-sm">
                    Select your departure and return dates
                  </p>
                </div>
                <TimingSection
                  startDate={startDate}
                  onStartDateChange={setStartDate}
                  endDate={endDate}
                  onEndDateChange={setEndDate}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-display text-earth-900 mb-2">
                    {coverImageUrl && !coverChosenByUser ? 'Your cover photo' : 'Add a cover photo'}
                  </h2>
                  <p className="text-earth-500 text-sm">
                    {coverImageUrl && !coverChosenByUser
                      ? `Picked for ${defaultTripName(primaryDestination)}. Keep it, or choose your own.`
                      : 'Optional — you can always add one later'}
                  </p>
                </div>
                <ImageSection
                  coverImageUrl={coverImageUrl}
                  onImageChange={handleImageChange}
                  objectPosition={imagePosition}
                  onPositionChange={setImagePosition}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 mt-4 border-t border-sand-200">
        <Button
          type="button"
          variant="ghost"
          onClick={goBack}
          disabled={isSubmitting}
          className="text-earth-600 hover:text-earth-800 hover:bg-earth-50 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex items-center gap-3">
          {step === TOTAL_STEPS - 1 && !coverImageUrl && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="text-earth-500 hover:text-earth-700"
            >
              Skip
            </Button>
          )}
          <Button
            type="button"
            variant="sunset"
            onClick={goNext}
            disabled={!canProceed() || isSubmitting}
            className="gap-2 px-6"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : step === TOTAL_STEPS - 1 ? (
              'Create Trip'
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateTripForm;
