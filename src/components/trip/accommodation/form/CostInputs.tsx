
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseCost, formatCost } from '@/utils/costUtils';

interface CostInputsProps {
  cost: string | null;
  currency: string;
  onCostChange: (value: string | null) => void;
  onCurrencyChange: (value: string) => void;
}

const CostInputs: React.FC<CostInputsProps> = ({
  cost,
  currency,
  onCostChange,
  onCurrencyChange,
}) => {
  // Handle the cost input change
  const handleCostChange = (value: string) => {
    // Allow empty string to be converted to null
    if (value === '') {
      onCostChange(null);
      return;
    }

    // Remove any non-numeric characters except decimal point and negative sign
    const cleanValue = value.replace(/[^\d.-]/g, '');
    
    // Parse the cleaned value
    const parsedValue = parseCost(cleanValue);
    
    // If the value is valid, format it
    if (parsedValue !== null) {
      onCostChange(formatCost(parsedValue));
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="cost">Total Cost</Label>
        <Input
          id="cost"
          type="text"
          value={cost || ''}
          onChange={(e) => handleCostChange(e.target.value)}
          placeholder="0.00"
          inputMode="decimal"
        />
      </div>
      <div>
        <Label htmlFor="currency">Currency</Label>
        <Input
          id="currency"
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          placeholder="USD"
        />
      </div>
    </div>
  );
};

export default CostInputs;
