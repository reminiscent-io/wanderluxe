import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageSection, { ImageMetadata } from "./ImageSection";
import TimingSection from "./TimingSection";
import DestinationInput from "./DestinationInput";
import PrimaryDestinationInput from "./PrimaryDestinationInput";
import { supabase } from '@/integrations/supabase/client';
import { generateDateArray } from '../../../utils/dateUtils';
import { createTripDays } from '@/services/tripDaysService';
import { addOwnerToTripShares } from '@/services/travelers';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, MapPin, Pen, CalendarDays, Camera, Loader2 } from 'lucide-react';

interface CreateTripFormProps {
  onSubmit: (tripId: string) => void;
  onCancel: () => void;
}

const TOTAL_STEPS = 4;

const stepConfig = [
  { icon: MapPin, label: 'Destination' },
  { icon: Pen, label: 'Name' },
  { icon: CalendarDays, label: 'Dates' },
  { icon: Camera, label: 'Photo' },
];

const CreateTripForm: React.FC<CreateTripFormProps> = ({ onSubmit, onCancel }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Form state
  const [tripName, setTripName] = useState('');
  const [primaryDestination, setPrimaryDestination] = useState('');
  const [primaryDestinationPlaceId, setPrimaryDestinationPlaceId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [imagePosition, setImagePosition] = useState('center 50%');
  const [photographerName, setPhotographerName] = useState('');
  const [photographerUsername, setPhotographerUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePrimaryDestinationChange = useCallback((destination: string, placeId: string) => {
    setPrimaryDestination(destination);
    setPrimaryDestinationPlaceId(placeId);
  }, []);

  const handleImageChange = useCallback((url: string, metadata?: ImageMetadata) => {
    setCoverImageUrl(url);
    setPhotographerName(metadata?.photographer || '');
    setPhotographerUsername(metadata?.username || '');
  }, []);

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return primaryDestination.trim().length > 0;
      case 1: return tripName.trim().length > 0;
      case 2: return !!startDate && !!endDate && new Date(startDate) < new Date(endDate);
      case 3: return true; // Photo is optional
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
          destination: tripName,
          arrival_date: startDate,
          departure_date: endDate,
          cover_image_url: coverImageUrl || null,
          cover_image_position: imagePosition || 'center 50%',
          cover_image_photographer: photographerName || null,
          cover_image_photographer_username: photographerUsername || null,
          is_public: false,
          primary_destination: primaryDestination || null,
          primary_destination_place_id: primaryDestinationPlaceId || null,
        } as any])
        .select('trip_id')
        .single();

      if (tripError) throw tripError;

      if (trip) {
        await addOwnerToTripShares(trip.trip_id, user.id);
        const days = generateDateArray(startDate, endDate);
        await createTripDays(trip.trip_id, days);
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
                    Name your trip
                  </h2>
                  <p className="text-earth-500 text-sm">
                    Give it a name you'll remember
                  </p>
                </div>
                <DestinationInput
                  destination={tripName}
                  setDestination={setTripName}
                  hideLabel
                  autoFocus
                  placeholder={`e.g., Summer in ${primaryDestination.split(',')[0] || 'Paris'}`}
                  inputClassName="text-center text-lg py-4"
                />
              </div>
            )}

            {step === 2 && (
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

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-display text-earth-900 mb-2">
                    Add a cover photo
                  </h2>
                  <p className="text-earth-500 text-sm">
                    Optional — you can always add one later
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
