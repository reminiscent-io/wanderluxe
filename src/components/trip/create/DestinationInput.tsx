import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DestinationInputProps {
  destination: string;
  setDestination: (value: string) => void;
  hideLabel?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  inputClassName?: string;
}

const DestinationInput: React.FC<DestinationInputProps> = ({
  destination,
  setDestination,
  hideLabel,
  autoFocus,
  placeholder = "e.g., NYE in Paris",
  inputClassName,
}) => {
  return (
    <div className="space-y-3">
      {!hideLabel && (
        <Label htmlFor="destination" className="text-earth-700 font-semibold">Trip name<span className="text-red-500"> *</span></Label>
      )}
      <Input
        id="destination"
        placeholder={placeholder}
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        required
        autoFocus={autoFocus}
        className={cn(
          "bg-white/70 border-earth-200 focus:border-earth-400 focus:ring-earth-400 rounded-xl py-3 px-4 shadow-sm",
          inputClassName
        )}
      />
    </div>
  );
};

export default DestinationInput;
