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
    <div className="space-y-2">
      <Label htmlFor="destination">Where are you going?</Label>
      <Input
        id="destination"
        placeholder="Enter destination"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        required
      />
    </div>
  );
};

export default DestinationInput;