import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Check, SkipForward, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ExtractedItemCard from './ExtractedItemCard';
import { supabase } from '@/integrations/supabase/client';
import TransportationDialog from '@/components/trip/transportation/TransportationDialog';
import AccommodationDialog from '@/components/trip/accommodation/AccommodationDialog';
import ActivityDialog from '@/components/trip/day/activities/ActivityDialog';
import RestaurantReservationDialog from '@/components/trip/dining/RestaurantReservationDialog';
import type { ExtractedItem, TravelItemType } from '@/types/ai-assistant';
import type { Tables } from '@/integrations/supabase/types';

interface ItemStepperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ExtractedItem[];
  tripId: string;
  onItemProcessed: (itemId: string, status: 'created' | 'skipped') => void;
  onComplete: () => void;
}

// Helper functions to map extracted fields to dialog initial data
const toDbTime = (t?: string | null) => (t && /^\d{2}:\d{2}$/.test(t) ? t : null);

const mapToTransportation = (f: Record<string, any>): Partial<Tables<'transportation'>> => {
  const toType = (raw?: string | null): Tables<'transportation'>['type'] | undefined => {
    const v = (raw || '').toLowerCase();
    if (v.includes('flight') || v.includes('air')) return 'flight';
    if (v.includes('train')) return 'train';
    if (v.includes('ferry')) return 'ferry';
    if (v.includes('shuttle') || v.includes('bus') || v.includes('coach')) return 'shuttle';
    if (v.includes('rental')) return 'rental_car';
    if (v.includes('uber') || v.includes('lyft') || v.includes('taxi') || v.includes('car')) return 'car_service';
    return (f.type as any) || 'flight';
  };

  return {
    type: toType(f.type),
    provider: f.carrier ?? null,
    departure_location: f.departure_location ?? null,
    arrival_location: f.arrival_location ?? null,
    start_date: f.departure_date ?? '',
    start_time: toDbTime(f.departure_time),
    end_date: (f.arrival_date ?? f.departure_date) ?? '',
    end_time: toDbTime(f.arrival_time),
    confirmation_number: f.confirmation_number ?? null,
    cost: typeof f.cost === 'number' ? f.cost : null,
    currency: f.currency ?? 'USD',
    details: null,
  };
};

const mapToAccommodation = (f: Record<string, any>, tripId: string) => {
  const parts: string[] = [];
  if (f.provider) parts.push(`Booked via ${f.provider}`);
  if (f.confirmation_number) parts.push(`Confirmation ${f.confirmation_number}`);

  return {
    hotel: f.name ?? '',
    hotel_details: parts.join(' • '),
    hotel_url: f.website ?? '',
    hotel_checkin_date: f.check_in_date ?? '',
    hotel_checkout_date: f.check_out_date ?? '',
    checkin_time: toDbTime(f.check_in_time) ?? '15:00',
    checkout_time: toDbTime(f.check_out_time) ?? '11:00',
    cost: typeof f.cost === 'number' ? f.cost : null,
    currency: f.currency ?? 'USD',
    hotel_address: f.address ?? '',
    hotel_phone: f.phone ?? '',
    hotel_place_id: '',
    hotel_website: f.website ?? '',
    expense_type: 'accommodation',
    is_paid: false,
    expense_date: '',
    order_index: 0,
    travelers: [],
    trip_id: tripId,
  };
};

const mapToActivity = (f: Record<string, any>, tripId: string) => ({
  title: f.name ?? '',
  description: f.notes ?? '',
  date: f.date ?? '',
  start_time: toDbTime(f.start_time) ?? '',
  end_time: toDbTime(f.end_time) ?? '',
  cost: typeof f.cost === 'number' ? String(f.cost) : '',
  currency: f.currency ?? 'USD',
  location_address: f.location ?? null,
  travelers: [],
  trip_id: tripId,
});

const mapToReservation = (f: Record<string, any>, tripId: string) => ({
  restaurant_name: f.restaurant_name ?? '',
  reservation_date: f.date ?? '',
  reservation_time: toDbTime(f.time) ?? '',
  number_of_people: typeof f.party_size === 'number' ? f.party_size : undefined,
  address: f.address ?? '',
  phone_number: f.phone ?? undefined,
  website: f.website ?? undefined,
  notes: f.notes ?? '',
  cost: typeof f.cost === 'number' ? f.cost : undefined,
  currency: f.currency ?? 'USD',
  place_id: undefined,
  rating: undefined,
  trip_id: tripId,
});

const ItemStepperDialog: React.FC<ItemStepperDialogProps> = ({
  open,
  onOpenChange,
  items,
  tripId,
  onItemProcessed,
  onComplete
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tripDates, setTripDates] = useState<{
    arrival_date: string | null;
    departure_date: string | null;
    destination: string | null;
  }>({ arrival_date: null, departure_date: null, destination: null });

  // Reset internal state whenever the dialog opens so stale index / editDialogOpen
  // from a previous session don't cause the dialog to render nothing.
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setEditDialogOpen(false);
    }
  }, [open]);

  useEffect(() => {
    const fetchTrip = async () => {
      const { data } = await supabase
        .from('trips')
        .select('arrival_date, departure_date, destination')
        .eq('trip_id', tripId)
        .single();
      if (data) {
        setTripDates({
          arrival_date: data.arrival_date ?? null,
          departure_date: data.departure_date ?? null,
          destination: data.destination ?? null
        });
      }
    };
    if (open && tripId) fetchTrip();
  }, [open, tripId]);

  const currentItem = items[currentIndex];
  const isLastItem = currentIndex === items.length - 1;
  const processedCount = items.filter(i => i.status !== 'pending').length;

  // Get initial data for the current item's form
  const getInitialData = useCallback(() => {
    if (!currentItem) return {};

    switch (currentItem.itemType) {
      case 'transportation':
        return mapToTransportation(currentItem.fields);
      case 'accommodation':
        return mapToAccommodation(currentItem.fields, tripId);
      case 'activity':
        return mapToActivity(currentItem.fields, tripId);
      case 'reservation':
        return mapToReservation(currentItem.fields, tripId);
      default:
        return {};
    }
  }, [currentItem, tripId]);

  const initialData = useMemo(() => getInitialData(), [getInitialData]);

  const handleSkip = useCallback(() => {
    if (!currentItem) return;
    onItemProcessed(currentItem.id, 'skipped');

    if (isLastItem) {
      onComplete();
      onOpenChange(false);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentItem, isLastItem, onItemProcessed, onComplete, onOpenChange]);

  const handleEditClick = useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  const handleDialogSuccess = useCallback(() => {
    if (!currentItem) return;
    onItemProcessed(currentItem.id, 'created');
    setEditDialogOpen(false);

    if (isLastItem) {
      onComplete();
      onOpenChange(false);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentItem, isLastItem, onItemProcessed, onComplete, onOpenChange]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  if (!currentItem) return null;

  return (
    <>
      <Dialog open={open && !editDialogOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-earth-700">
              Review Item {currentIndex + 1} of {items.length}
            </DialogTitle>
          </DialogHeader>

          {/* Progress indicator */}
          <div className="flex gap-1 mb-4">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  idx < currentIndex ? 'bg-green-500' :
                  idx === currentIndex ? 'bg-earth-500' :
                  item.status === 'created' ? 'bg-green-500' :
                  item.status === 'skipped' ? 'bg-sand-300' :
                  'bg-sand-200'
                )}
              />
            ))}
          </div>

          {/* Current item card - click to open full edit dialog */}
          <div className="mb-4">
            <ExtractedItemCard
              item={currentItem}
              onEdit={handleEditClick}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Skip
            </Button>

            <Button
              onClick={handleEditClick}
              className="flex-1 bg-earth-500 hover:bg-earth-600 text-white"
              title="Open full form to edit and add"
            >
              <Check className="w-4 h-4 mr-1" />
              Edit & {isLastItem ? 'Finish' : 'Next'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Type-specific edit dialogs */}
      {currentItem.itemType === 'transportation' && (
        <TransportationDialog
          key={`transport-${currentItem.id}`}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          tripId={tripId}
          initialData={initialData as Partial<Tables<'transportation'>>}
          onSuccess={handleDialogSuccess}
        />
      )}

      {currentItem.itemType === 'accommodation' && (
        <AccommodationDialog
          key={`accommodation-${currentItem.id}`}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          tripId={tripId}
          initialData={initialData as any}
          onSuccess={handleDialogSuccess}
        />
      )}

      {currentItem.itemType === 'activity' && (
        <ActivityDialog
          key={`activity-${currentItem.id}`}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          tripId={tripId}
          initialData={initialData as any}
          onSuccess={handleDialogSuccess}
        />
      )}

      {currentItem.itemType === 'reservation' && (
        <RestaurantReservationDialog
          key={`reservation-${currentItem.id}`}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          tripId={tripId}
          initialData={initialData as any}
          onSuccess={handleDialogSuccess}
          tripArrivalDate={tripDates.arrival_date ?? undefined}
          tripDepartureDate={tripDates.departure_date ?? undefined}
          destination={tripDates.destination ?? undefined}
        />
      )}
    </>
  );
};

export default ItemStepperDialog;
