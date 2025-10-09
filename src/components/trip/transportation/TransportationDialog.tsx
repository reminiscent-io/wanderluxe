import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tables } from '@/integrations/supabase/types';
import TransportationForm from './TransportationForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TransportationType = Tables<'transportation'>;

interface TransportationDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: TransportationType | null;
  /** Now expects the saved outbound record (legacy behavior preserved) */
  onSuccess: (updated: TransportationType) => void;
  buttonClassName?: string;
}

type SaveBulkPayload = {
  isRoundtrip?: boolean;
  rtGroupId?: string;
  outbound: Partial<TransportationType>;
  returnLeg?: Partial<TransportationType>;
};

const TransportationDialog: React.FC<TransportationDialogProps> = ({
  tripId,
  open,
  onOpenChange,
  initialData,
  onSuccess,
  buttonClassName = "bg-earth-500 hover:bg-earth-600 text-white font-semibold",
}) => {
  const [tripDates, setTripDates] = useState<{
    arrival_date: string | null;
    departure_date: string | null;
  }>({ arrival_date: null, departure_date: null });

  const [initialReturnData, setInitialReturnData] = useState<TransportationType | null>(null);

  useEffect(() => {
    async function fetchTripDates() {
      const { data, error } = await supabase
        .from('trips')
        .select('arrival_date, departure_date')
        .eq('trip_id', tripId)
        .single();
      if (!error && data && data.arrival_date && data.departure_date) {
        setTripDates({
          arrival_date: data.arrival_date,
          departure_date: data.departure_date,
        });
      }
    }
    if (open) fetchTripDates();
  }, [tripId, open]);

  // --- Roundtrip pairing helpers (no schema change): store rt meta in `details` ---
  const extractRtMeta = (details?: string | null) => {
    if (!details) return null;
    const m = details.match(/\[rt:([a-zA-Z0-9-]+);leg:(outbound|return)\]/);
    if (!m) return null;
    return { groupId: m[1], leg: m[2] as 'outbound' | 'return' };
  };

  // When editing a flight with rt meta, fetch the paired leg so we can render both legs
  useEffect(() => {
    const loadPairedLeg = async () => {
      setInitialReturnData(null);
      if (!open || !initialData || initialData.type !== 'flight') return;

      const meta = extractRtMeta(initialData.details);
      if (!meta?.groupId) return;

      const { data, error } = await supabase
        .from('transportation')
        .select('*')
        .eq('trip_id', tripId)
        .neq('id', initialData.id)
        .ilike('details', `%[rt:${meta.groupId};leg:return]%`)
        .maybeSingle();

      if (!error && data) {
        setInitialReturnData(data);
      }
    };
    loadPairedLeg();
  }, [open, tripId, initialData?.id]); // ok if initialData is undefined

  // Append or replace rt meta inside details
  const withRtDetails = (details: string | null | undefined, groupId: string, leg: 'outbound' | 'return') => {
    const base = (details || '').replace(/\[rt:[^\]]+\]/g, '').trim();
    const spacer = base.length ? ' ' : '';
    return `${base}${spacer}[rt:${groupId};leg:${leg}]`;
  };

  // Normalize payload fields accepted by DB
  const toDbPayload = (p: Partial<TransportationType>) => ({
    type: p.type,
    provider: p.provider,
    details: p.details,
    confirmation_number: p.confirmation_number,
    start_date: p.start_date,
    start_time: p.start_time,
    end_date: p.end_date,
    end_time: p.end_time,
    departure_location: p.departure_location,
    arrival_location: p.arrival_location,
    cost: p.cost,
    currency: p.currency,
  });

  // ---- SAVE (single or bulk roundtrip) ----
  const handleSubmit = async (data: Partial<TransportationType> | SaveBulkPayload) => {
    try {
      // --- BULK path (roundtrip) ---
      if ((data as SaveBulkPayload).outbound) {
        const { outbound, returnLeg, isRoundtrip, rtGroupId } = data as SaveBulkPayload;
        const groupId = rtGroupId || crypto.randomUUID();

        // Upsert outbound
        const outboundPayload = {
          ...toDbPayload(outbound),
          details: withRtDetails(outbound.details, groupId, 'outbound'),
        };

        let savedOutbound: TransportationType;
        if (initialData?.id) {
          const { data: updated, error } = await supabase
            .from('transportation')
            .update(outboundPayload)
            .eq('id', initialData.id)
            .select('*').single();
          if (error || !updated) throw error;
          savedOutbound = updated;
        } else {
          const { data: inserted, error } = await supabase
            .from('transportation')
            .insert([{ trip_id: tripId, ...outboundPayload, created_at: new Date().toISOString() }])
            .select('*').single();
          if (error || !inserted) throw error;
          savedOutbound = inserted;
        }

        let savedReturn: TransportationType | undefined;

        // Upsert return leg if present / roundtrip
        if (isRoundtrip && returnLeg) {
          const returnPayload = {
            ...toDbPayload(returnLeg),
            details: withRtDetails(returnLeg.details, groupId, 'return'),
          };

          // Try to find an existing return leg by rt meta
          const { data: existingReturn, error: findErr } = await supabase
            .from('transportation')
            .select('*')
            .eq('trip_id', tripId)
            .ilike('details', `%[rt:${groupId};leg:return]%`)
            .maybeSingle();

          if (findErr) {
            // it's ok to continue and insert
          }

          if (existingReturn?.id) {
            const { data: updatedReturn, error: updErr } = await supabase
              .from('transportation')
              .update(returnPayload)
              .eq('id', existingReturn.id)
              .select('*').single();
            if (updErr || !updatedReturn) throw updErr;
            savedReturn = updatedReturn;
          } else {
            const { data: insertedReturn, error: insErr } = await supabase
              .from('transportation')
              .insert([{ trip_id: tripId, ...returnPayload, created_at: new Date().toISOString() }])
              .select('*').single();
            if (insErr || !insertedReturn) throw insErr;
            savedReturn = insertedReturn;
          }
        } else {
          // If user turned RT OFF while editing a previously paired item, we could optionally
          // delete the paired leg. For now, we do nothing to avoid accidental data loss.
        }

        toast.success(isRoundtrip ? 'Roundtrip saved' : 'Transportation saved');
        onSuccess(savedOutbound);
        onOpenChange(false);
        return { outbound: savedOutbound, returnLeg: savedReturn };
      }

      // --- SINGLE path (legacy) ---
      const single = data as Partial<TransportationType>;
      const basePayload = {
        type: single.type,
        provider: single.provider,
        details: single.details,
        confirmation_number: single.confirmation_number,
        start_date: single.start_date,
        start_time: single.start_time,
        end_date: single.end_date,
        end_time: single.end_time,
        departure_location: single.departure_location,
        arrival_location: single.arrival_location,
        cost: single.cost,
        currency: single.currency,
      };

      let savedRecord: TransportationType;

      if (initialData?.id) {
        const { data: updatedRecord, error } = await supabase
          .from('transportation')
          .update(basePayload)
          .eq('id', initialData.id)
          .select('*')
          .single();
        if (error || !updatedRecord) throw error;
        savedRecord = updatedRecord;
        toast.success('Transportation updated successfully');
      } else {
        const { data: inserted, error } = await supabase
          .from('transportation')
          .insert([{ trip_id: tripId, ...basePayload, created_at: new Date().toISOString() }])
          .select('*')
          .single();
        if (error || !inserted) throw error;
        savedRecord = inserted;
        toast.success('Transportation added successfully');
      }

      onSuccess(savedRecord);
      onOpenChange(false);
      return savedRecord;
    } catch (err) {
      console.error('Error saving transportation:', err);
      toast.error('Failed to save transportation');
      throw err;
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleDelete = async () => {
    try {
      if (!initialData?.id) return;
      const { error } = await supabase
        .from('transportation')
        .delete()
        .eq('id', initialData.id);
      if (error) throw error;
      toast.success('Transportation deleted successfully');
      onOpenChange(false);
    } catch (err) {
      console.error('Error deleting transportation:', err);
      toast.error('Failed to delete transportation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {initialData ? 'Edit Transportation' : 'Add Transportation'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update your transportation details.'
              : 'Enter the details for your transportation.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-none px-1">
          <TransportationForm
            initialData={initialData || undefined}
            initialReturnData={initialReturnData || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDelete={initialData ? handleDelete : undefined}
            tripArrivalDate={tripDates.arrival_date}
            tripDepartureDate={tripDates.departure_date}
            buttonClassName={buttonClassName}
            tripId={tripId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransportationDialog;
