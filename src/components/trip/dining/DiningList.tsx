import React, {
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import RestaurantCard from './RestaurantCard';
import RestaurantReservationDialog from './RestaurantReservationDialog';
import DeleteReservationDialog from './DeleteReservationDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { reservationsKey } from '@/utils/queryKeys';

interface DiningListProps {
  reservations: Array<{
    id: string;
    day_id: string;
    trip_id: string;
    restaurant_name: string;
    reservation_time?: string;
    number_of_people?: number;
    confirmation_number?: string;
    notes?: string;
    cost?: number;
    currency?: string;
    address?: string;
    phone_number?: string;
    website?: string;
    rating?: number;
    created_at: string;
  }>;
  formatTime: (time?: string) => string;
  dayId: string;
  tripId: string;
  className?: string;
  tripArrivalDate?: string;
  tripDepartureDate?: string;
  destination?: string;
}

/**
 * Fully self-contained dining list:
 * • Renders its own heading & “+” button
 * • Owns add/edit dialog and delete confirmation
 * • Surfaces DB errors and refreshes cache (or realtime) automatically
 */
const DiningList = forwardRef<HTMLDivElement, DiningListProps>(
  (
    { reservations, formatTime, dayId, tripId, className = '', tripArrivalDate, tripDepartureDate, destination },
    ref
  ): JSX.Element => {
    const qc = useQueryClient();

    /* ---------- local state ---------- */
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    /* expose “open dialog” to parent if ever needed */
    useImperativeHandle(ref, () => ({
      openAddDialog: () => setIsDialogOpen(true),
    }));

    /* ---------- save (insert / update) ---------- */
    const handleSave = useCallback(
      async (raw: any) => {
        setIsSubmitting(true);

        // Use the day_id from the form data (already looked up in RestaurantReservationForm)
        let targetDayId = raw.day_id || dayId;

        const payload = {
          ...raw,
          day_id: targetDayId,
          trip_id: tripId,
          order_index:
            raw.order_index !== undefined
              ? raw.order_index
              : reservations.length,
          reservation_time: raw.reservation_time || null,
        };

        try {
          if (editingId) {
            /* ----- UPDATE ----- */
            const { data, status } = await supabase
              .from('reservations')
              .update(payload)
              .eq('id', editingId)
              .eq('trip_id', tripId)
              .select()
              .throwOnError();

            console.log('UPDATE status', status, 'data', data);
            toast.success('Reservation updated');
          } else {
            /* ----- INSERT ----- */
            const { data, status } = await supabase
              .from('reservations')
              .insert([payload])
              .select()
              .throwOnError();

            console.log('INSERT status', status, 'data', data);
            if (data.length === 0) {
              toast.error(
                'Row saved, but SELECT policy is hiding it. Check RLS.'
              );
            } else {
              toast.success('Reservation added');
            }
          }

          /* invalidate day-specific reservations */
          await qc.invalidateQueries({
            queryKey: reservationsKey(tripId, dayId),
          });
          
          /* invalidate sidebar reservations query */
          await qc.invalidateQueries({
            queryKey: ['reservations', tripId],
          });
          
          /* also invalidate trip data like activities do */
          await qc.invalidateQueries({ queryKey: ['trip'] });

          setIsDialogOpen(false);
          setEditingId(null);
        } catch (err) {
          console.error(err);
          toast.error('Failed to save reservation');
        } finally {
          setIsSubmitting(false);
        }
      },
      [dayId, tripId, editingId, reservations.length, qc]
    );

    /* ---------- delete ---------- */
    const handleDelete = useCallback(async () => {
      if (!deletingId) return;
      try {
        await supabase
          .from('reservations')
          .delete()
          .eq('id', deletingId)
          .eq('trip_id', tripId)
          .throwOnError();

        toast.success('Reservation deleted');

        await qc.invalidateQueries({
          queryKey: reservationsKey(tripId, dayId),
        });
        
        /* also invalidate trip data like activities do */
        await qc.invalidateQueries({ queryKey: ['trip'] });
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete reservation');
      } finally {
        setDeletingId(null);
      }
    }, [deletingId, tripId, dayId, qc]);

    /* ---------- render ---------- */
    return (
      <div ref={ref} className={`space-y-4 ${className}`}>
        {/* heading */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-base font-semibold">Dining</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="bg-white/10 text-muted-foreground hover:bg-sand-600 h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* list */}
        <div className="space-y-3">
          {[...reservations]
            .sort((a, b) =>
              (a.reservation_time || '').localeCompare(
                b.reservation_time || ''
              )
            )
            .map((r) => (
              <RestaurantCard
                key={r.id}
                reservation={r}
                formatTime={formatTime}
                onClick={() => {
                  setEditingId(r.id);
                  setIsDialogOpen(true);
                }}
              />
            ))}
        </div>

        {/* add / edit */}
        <RestaurantReservationDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          tripId={tripId}
          initialData={
            editingId
              ? (() => {
                  const foundReservation = reservations.find((r) => r.id === editingId);
                  return foundReservation ? { ...foundReservation } : null;
                })()
              : { day_id: dayId, trip_id: tripId, order_index: reservations.length }
          }
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: reservationsKey(tripId, dayId) });
            qc.invalidateQueries({ queryKey: ['reservations', tripId] });
            qc.invalidateQueries({ queryKey: ['trip'] });
            setIsDialogOpen(false);
            setEditingId(null);
          }}
          tripArrivalDate={tripArrivalDate}
          tripDepartureDate={tripDepartureDate}
          destination={destination}
        />

        {/* delete confirm */}
        <DeleteReservationDialog
          isOpen={!!deletingId}
          onOpenChange={() => setDeletingId(null)}
          onDelete={handleDelete}
        />
      </div>
    );
  }
);

DiningList.displayName = 'DiningList';
export default DiningList;
