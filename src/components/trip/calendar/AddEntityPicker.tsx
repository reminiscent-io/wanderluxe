import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MapPin, UtensilsCrossed, BedDouble, Plane } from 'lucide-react';
import type { CalendarEntityType } from './eventMapping';

interface AddEntityPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (type: CalendarEntityType) => void;
}

const OPTIONS: { type: CalendarEntityType; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'activity', label: 'Activity', Icon: MapPin },
  { type: 'dining', label: 'Dining', Icon: UtensilsCrossed },
  { type: 'accommodation', label: 'Hotel', Icon: BedDouble },
  { type: 'transportation', label: 'Transport', Icon: Plane },
];

const AddEntityPicker: React.FC<AddEntityPickerProps> = ({ open, onOpenChange, onPick }) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="rounded-t-2xl">
      <SheetHeader><SheetTitle className="font-display">Add to this date</SheetTitle></SheetHeader>
      <div className="grid grid-cols-2 gap-3 py-4">
        {OPTIONS.map(({ type, label, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onPick(type)}
            className="flex flex-col items-center gap-2 rounded-card border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <Icon className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </SheetContent>
  </Sheet>
);

export default AddEntityPicker;
