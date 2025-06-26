import React, { useState, useRef, useCallback } from 'react';
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
  // Use local state to isolate from parent re-renders
  const [localFromValue, setLocalFromValue] = useState(fromValue);
  const [localToValue, setLocalToValue] = useState(toValue);
  
  // Track which field is being updated
  const [updatingField, setUpdatingField] = useState<'from' | 'to' | null>(null);

  const handleFromChange = useCallback((value: string, details?: any) => {
    setUpdatingField('from');
    setLocalFromValue(value);
    onFromChange(value);
    setTimeout(() => setUpdatingField(null), 200);
  }, [onFromChange]);

  const handleToChange = useCallback((value: string, details?: any) => {
    setUpdatingField('to');
    setLocalToValue(value);
    onToChange(value);
    setTimeout(() => setUpdatingField(null), 200);
  }, [onToChange]);

  return (
    <div className="flex space-x-4">
      <div className="flex-1">
        <RequiredLabel>From</RequiredLabel>
        <LocationSearchInput
          key={`from-${transportationType}`}
          value={updatingField === 'from' ? localFromValue : fromValue}
          onChange={handleFromChange}
          placeholder={transportationType === 'flight' ? "Search for departure airport..." : "Search for departure location..."}
          transportationType={transportationType}
        />
      </div>
      <div className="flex-1">
        <RequiredLabel>To</RequiredLabel>
        <LocationSearchInput
          key={`to-${transportationType}`}
          value={updatingField === 'to' ? localToValue : toValue}
          onChange={handleToChange}
          placeholder={transportationType === 'flight' ? "Search for arrival airport..." : "Search for arrival location..."}
          transportationType={transportationType}
        />
      </div>
    </div>
  );
};

export default LocationInputPair;