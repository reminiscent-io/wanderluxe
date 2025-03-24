import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CostInputsProps {
  cost: string | null;
  currency: string;
  onCostChange: (value: string | null) => void;
  onCurrencyChange: (value: string) => void;
}

const formatCost = (cost: number): string => {
  return cost.toLocaleString(); // This provides #,### formatting
};

const parseCost = (value: string): number | null => {
  // Remove non-numeric characters except for the decimal point
  const cleanedValue = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleanedValue);
  return isNaN(parsed) ? null : parsed;
};


const CostInputs: React.FC<CostInputsProps> = ({
  cost,
  currency,
  onCostChange,
  onCurrencyChange,
}) => {
  // Handle the cost input change
  const handleCostChange = (value: string) => {
    const parsed = parseCost(value);
    onCostChange(parsed !== null ? parsed.toString() : '');
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="cost">Total Cost</Label>
        <Input
          id="cost"
          type="text"
          value={cost ? formatCost(Number(cost)) : ''}
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