import React, { useRef, useCallback } from 'react';
import { Tables } from '@/integrations/supabase/types';
import LocationSearchInput from './LocationSearchInput';

type Transportation = Tables<'transportation'>;

interface LocationInputPairProps {
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  transportationType: string;
}

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
    {children} <span style={{ color: 'red' }}>*</span>
  </label>
);

/**
 * Isolated location input pair that prevents cross-field interference
 */
const LocationInputPair: React.FC<LocationInputPairProps> = ({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  transportationType
}) => {
  // Use refs to maintain stable values
  const fromValueRef = useRef(fromValue);
  const toValueRef = useRef(toValue);
  
  // Update refs when props change
  fromValueRef.current = fromValue;
  toValueRef.current = toValue;

  const handleFromChange = useCallback((value: string, _details?: google.maps.places.PlaceResult) => {
    onFromChange(value);
  }, [onFromChange]);

  const handleToChange = useCallback((value: string, _details?: google.maps.places.PlaceResult) => {
    onToChange(value);
  }, [onToChange]);

  return (
    <div className="flex space-x-4 w-full">
      <div className="flex-1 min-w-0">
        <RequiredLabel>From</RequiredLabel>
        <LocationSearchInput
          key={`from-${transportationType}`}
          value={fromValue}
          onChange={handleFromChange}
          placeholder={transportationType === 'flight' ? "Search for departure airport..." : "Search for departure location..."}
          transportationType={transportationType}
        />
      </div>
      <div className="flex-1 min-w-0">
        <RequiredLabel>To</RequiredLabel>
        <LocationSearchInput
          key={`to-${transportationType}`}
          value={toValue}
          onChange={handleToChange}
          placeholder={transportationType === 'flight' ? "Search for arrival airport..." : "Search for arrival location..."}
          transportationType={transportationType}
        />
      </div>
    </div>
  );
};

export default LocationInputPair;