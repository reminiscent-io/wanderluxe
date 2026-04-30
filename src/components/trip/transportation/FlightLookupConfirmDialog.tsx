import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import type { FlightStatusResponse } from '@/services/flightStatus';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: FlightStatusResponse | null;
  requestedDate: string;
  onApply: () => void;
  onCancel: () => void;
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = status.toLowerCase();
  if (s.includes('cancel')) return 'destructive';
  if (s.includes('delay')) return 'destructive';
  if (s.includes('arrived') || s.includes('landed')) return 'secondary';
  return 'outline';
}

function Segment({
  label,
  airportIata,
  airportName,
  scheduledTime,
  revisedTime,
}: {
  label: string;
  airportIata: string;
  airportName: string;
  scheduledTime: string;
  revisedTime: string | null;
}) {
  const hasRevision = revisedTime && revisedTime !== scheduledTime;
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-sand-500">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-lg font-semibold text-sand-900">{airportIata || '—'}</div>
        <div className="text-sm text-sand-600 truncate">{airportName}</div>
      </div>
      <div className="text-sm text-sand-700">
        <span className={hasRevision ? 'line-through text-sand-500' : ''}>
          Scheduled {scheduledTime}
        </span>
        {hasRevision && (
          <span className="ml-2 font-medium text-sunset-600">Now {revisedTime}</span>
        )}
      </div>
    </div>
  );
}

export default function FlightLookupConfirmDialog({
  open,
  onOpenChange,
  result,
  requestedDate,
  onApply,
  onCancel,
}: Props) {
  if (!result) return null;

  const dateMismatch = result.departure.scheduled_date_local !== requestedDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>
              {result.airline ? `${result.airline} ` : ''}
              {result.flight_iata}
            </span>
            {result.status && (
              <Badge variant={statusVariant(result.status)} className="font-normal">
                {result.status}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review flight details before applying to the form
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sand-800">
            <div className="font-semibold">{result.departure.airport_iata || '—'}</div>
            <ArrowRight className="h-4 w-4 text-sand-500" />
            <div className="font-semibold">{result.arrival.airport_iata || '—'}</div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Segment
              label="Departure"
              airportIata={result.departure.airport_iata}
              airportName={result.departure.airport_name}
              scheduledTime={result.departure.scheduled_time_local}
              revisedTime={result.departure.revised_time_local}
            />
            <Segment
              label="Arrival"
              airportIata={result.arrival.airport_iata}
              airportName={result.arrival.airport_name}
              scheduledTime={result.arrival.scheduled_time_local}
              revisedTime={result.arrival.revised_time_local}
            />
          </div>

          {dateMismatch && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                This flight departs on {result.departure.scheduled_date_local}, not{' '}
                {requestedDate}. Double-check the date before applying.
              </span>
            </div>
          )}

          <p className="text-xs text-sand-500">
            All times are local to the airport. Existing form values will not be overwritten.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="sunset" onClick={onApply}>
            Apply to form
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
