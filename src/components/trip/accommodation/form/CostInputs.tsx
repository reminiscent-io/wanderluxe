
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
  // Handle the cost input change
  const handleCostChange = (value: string) => {
    // Allow empty string to be converted to null
    if (value === '') {
      onCostChange(null);
      return;
    }

    // Only allow numbers and decimal point
    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }

    // If it's just a decimal point, add a leading zero
    if (value === '.') {
      onCostChange('0.');
      return;
    }

    // Prevent multiple decimal points
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
      return;
    }

    // Limit to two decimal places
    const parts = value.split('.');
    if (parts[1] && parts[1].length > 2) {
      return;
    }

    // Update the value
    onCostChange(value);
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
