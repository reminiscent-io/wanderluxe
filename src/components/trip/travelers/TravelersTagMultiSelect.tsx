import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTravelers, Traveler } from "@/hooks/useTravelers";
import { cn } from "@/lib/utils";

export interface TravelersTagMultiSelectProps {
  tripId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export default function TravelersTagMultiSelect({
  tripId,
  value = [],
  onChange,
  disabled = false,
  className,
}: TravelersTagMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const { travelers, loading } = useTravelers(tripId);

  const selectedTravelers = travelers.filter(traveler => 
    value.includes(traveler.id)
  );

  const handleSelect = (traveler: Traveler) => {
    const isSelected = value.includes(traveler.id);
    if (isSelected) {
      onChange(value.filter(id => id !== traveler.id));
    } else {
      onChange([...value, traveler.id]);
    }
    // Don't close the dropdown after selection to allow multiple selections
  };

  const handleRemove = (travelerId: string) => {
    onChange(value.filter(id => id !== travelerId));
  };

  const getDisplayName = (traveler: Traveler) => {
    return [traveler.first_name, traveler.last_name].filter(Boolean).join(' ');
  };

  if (loading) {
    return (
      <div className={cn("min-h-[2.5rem] border border-input rounded-md px-3 py-2", className)}>
        <span className="text-sm text-muted-foreground">Loading travelers...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[2.5rem] p-2"
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedTravelers.length === 0 ? (
                <span className="text-muted-foreground">Select travelers...</span>
              ) : (
                selectedTravelers.map((traveler) => (
                  <Badge
                    key={traveler.id}
                    variant="secondary"
                    className="gap-1 pr-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(traveler.id);
                    }}
                  >
                    {getDisplayName(traveler)}
                    <X className="h-3 w-3 hover:bg-muted rounded-sm cursor-pointer" />
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-full p-0 z-[99999] bg-white border shadow-md" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command className="bg-white" shouldFilter={false}>
            <CommandInput placeholder="Search travelers..." className="bg-white" />
            <CommandEmpty>
              {travelers.length === 0 
                ? "No travelers added yet." 
                : "No results found."
              }
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto bg-white">
              {travelers.map((traveler) => (
                <CommandItem
                  key={traveler.id}
                  value={traveler.id}
                  onSelect={() => {
                    handleSelect(traveler);
                    // Keep the dropdown open for multiple selections
                  }}
                  className="cursor-pointer hover:bg-gray-50 bg-white data-[selected=true]:bg-gray-100"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(traveler.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2">
                      {getDisplayName(traveler)}
                      {traveler.is_owner && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Owner
                        </span>
                      )}
                    </span>
                    {traveler.shared_with_email && (
                      <span className="text-xs text-muted-foreground">
                        {traveler.shared_with_email}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}