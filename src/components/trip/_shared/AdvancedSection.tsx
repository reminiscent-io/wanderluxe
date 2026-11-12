import { useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AdvancedSectionProps {
  /** Label of the free-text field inside, e.g. "Notes" or "Details". */
  notesLabel: string;
  /** Current free-text value; non-blank text shows up in the trigger. */
  notes?: string | null;
  travelerCount?: number;
  children: ReactNode;
}

/** What the collapsed section holds, e.g. "Notes, 2 travelers". */
function advancedSummary(notesLabel: string, notes: string | null | undefined, travelerCount = 0): string {
  return [
    notes?.trim() ? notesLabel : null,
    travelerCount ? `${travelerCount} traveler${travelerCount === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Collapsed "Advanced" section shared by the entity forms (activity, stay,
 * transport, dining). Closed by default; the trigger names what's filled in,
 * so a collapsed section never hides data the user already entered.
 * react-hook-form callers keep their values through the collapse because
 * unmounted fields stay registered (shouldUnregister: false, the default).
 */
export default function AdvancedSection({ notesLabel, notes, travelerCount = 0, children }: AdvancedSectionProps) {
  const [open, setOpen] = useState(false);
  const summary = advancedSummary(notesLabel, notes, travelerCount);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-foreground bg-muted hover:bg-accent rounded-md border border-border transition-colors"
        >
          <span className="flex min-w-0 items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">Advanced{summary ? `: ${summary}` : ""}</span>
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}
