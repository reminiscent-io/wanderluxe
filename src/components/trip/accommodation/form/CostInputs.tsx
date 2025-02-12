
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const handleCostChange = (value: string) => {
    // Allow empty string to be converted to null
    if (value === '') {
      onCostChange(null);
      return;
    }

    // Only allow numbers and decimal point
    const cleanValue = value.replace(/[^\d.]/g, '');
    
    // Ensure proper decimal format
    const parts = cleanValue.split('.');
    const formattedValue = parts[0] + (parts.length > 1 ? '.' + parts[1].slice(0, 2) : '');
    
    onCostChange(formattedValue);
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
