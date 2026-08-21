import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTravelers, Traveler } from "@/hooks/useTravelers";
import { cn } from "@/lib/utils";

export interface TravelersTagMultiSelectProps {
  tripId: string;
  value?: string[]; // RHF can hand us undefined on first render
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
}

/** Best-effort coercion of unknown hook shapes into a Traveler[] */
function coerceTravelersArray(input: unknown): Traveler[] {
  if (Array.isArray(input)) return input as Traveler[];
  if (input && typeof input === "object") {
    const obj = input as { data?: unknown; travelers?: unknown };
    if (Array.isArray(obj.data)) return obj.data as Traveler[];
    if (Array.isArray(obj.travelers)) return obj.travelers as Traveler[];
  }
  return [];
}

/** Defensive normalization of selected ids */
function coerceIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).filter((v): v is string => typeof v === "string" && v.length > 0);
}

export default function TravelersTagMultiSelect({
  tripId,
  value,
  onChange,
  disabled = false,
  className,
}: TravelersTagMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const { travelers, loading } = useTravelers(tripId);

  // Defensive normalization
  const allTravelers = useMemo(() => coerceTravelersArray(travelers), [travelers]);
  const selectedIds = useMemo(() => coerceIdArray(value), [value]);

  const selectedTravelers = useMemo(
    () => allTravelers.filter((t) => selectedIds.includes(t.id)),
    [allTravelers, selectedIds]
  );

  const handleSelect = (traveler: Traveler) => {
    const id = traveler.id;
    const isSelected = selectedIds.includes(id);
    if (isSelected) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
    // keep popover open for multi-select
  };

  const handleRemove = (travelerId: string) => {
    onChange(selectedIds.filter((x) => x !== travelerId));
  };

  const getDisplayName = (t: Traveler) =>
    [t.first_name, t.last_name].filter(Boolean).join(" ") || "Traveler";

  if (loading) {
    return (
      <div className={cn("min-h-[2.5rem] border border-input rounded-md px-3 py-2", className)}>
        <span className="text-sm text-muted-foreground">Loading travelers...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[2.5rem] p-2"
            disabled={disabled}
          >
            <div className="flex min-w-0 flex-1 flex-wrap gap-1 text-left">
              {selectedTravelers.length === 0 ? (
                <span className="text-muted-foreground">Select travelers...</span>
              ) : (
                selectedTravelers.map((t) => (
                  <Badge
                    key={t.id}
                    variant="secondary"
                    className="max-w-full gap-1 whitespace-normal break-words pr-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(t.id);
                    }}
                  >
                    {getDisplayName(t)}
                    <X className="h-3 w-3 hover:bg-muted rounded-sm cursor-pointer" />
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0 z-[99999] bg-white border shadow-md pointer-events-auto"
          align="start"
          side="bottom"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{ zIndex: 99999 }}
        >
          <div className="relative pointer-events-auto">
            {/* Let Command handle filtering itself */}
            <Command className="bg-white pointer-events-auto" shouldFilter>
              <CommandInput
                placeholder="Search travelers..."
                className="bg-white pointer-events-auto"
              />
              <CommandEmpty>
                {allTravelers.length === 0 ? "No travelers added yet." : "No results found."}
              </CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto bg-white pointer-events-auto">
                {allTravelers.map((t) => {
                  const selected = selectedIds.includes(t.id);
                  const displayName = getDisplayName(t);
                  return (
                    <CommandItem
                      key={t.id}
                      value={`${displayName} ${t.shared_with_email ?? ""}`.trim()}
                      onSelect={() => handleSelect(t)}
                      className="cursor-pointer hover:bg-secondary bg-white data-[selected=true]:bg-muted pointer-events-auto"
                    >
                      <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                      <div className="flex flex-col pointer-events-none">
                        <span className="flex items-center gap-2">
                          {displayName}
                          {/* Optional badge if your Traveler type includes this */}
                          {t.is_owner && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              Owner
                            </span>
                          )}
                        </span>
                        {t.shared_with_email && (
                          <span className="text-xs text-muted-foreground">
                            {t.shared_with_email}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </Command>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
