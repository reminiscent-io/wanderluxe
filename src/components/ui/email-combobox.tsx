import { useState } from "react";
import { Check, ChevronsUpDown, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EmailComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export function EmailCombobox({
  value,
  onChange,
  suggestions,
  placeholder = "Select or type email...",
  className
}: EmailComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between pl-9 text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search or type email..." 
            value={value}
            onValueChange={onChange}
          />
          <CommandList>
            <CommandEmpty>
              {value ? "Press Enter to use this email" : "No previous emails found"}
            </CommandEmpty>
            {suggestions.length > 0 && (
              <CommandGroup heading="Previously shared with">
                {suggestions.map((email) => (
                  <CommandItem
                    key={email}
                    value={email}
                    onSelect={(currentValue) => {
                      onChange(currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === email ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    {email}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}