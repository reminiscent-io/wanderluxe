import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DestinationInputProps {
  destination: string;
  setDestination: (value: string) => void;
}

const DestinationInput: React.FC<DestinationInputProps> = ({
  destination,
  setDestination
}) => {
  return (
    <div className="space-y-3">
      <Label htmlFor="destination" className="text-earth-700 font-semibold">Trip name<span className="text-red-500"> *</span></Label>
      <Input
        id="destination"
        placeholder="e.g., NYE in Paris"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        required
        className="bg-white/70 border-earth-200 focus:border-earth-400 focus:ring-earth-400 rounded-xl py-3 px-4 shadow-sm"
      />
    </div>
  );
};

export default DestinationInput;