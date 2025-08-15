import { useState } from "react";
import { Mail, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  placeholder = "email@example.com",
  className
}: EmailComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative flex", className)}>
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="email"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-10"
          autoFocus={false}
          list={suggestions.length > 0 ? "email-suggestions" : undefined}
        />
        {suggestions.length > 0 && (
          <>
            <datalist id="email-suggestions">
              {suggestions.map((email) => (
                <option key={email} value={email} />
              ))}
            </datalist>
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[300px]">
                <DropdownMenuLabel>Previously shared with</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {suggestions.map((email) => (
                  <DropdownMenuItem 
                    key={email} 
                    onSelect={() => {
                      onChange(email);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {email}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}