
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCost, parseCost } from '@/utils/costUtils';

interface CostInputsProps {
  cost: number | null;
  currency: string;
  onCostChange: (value: number | null) => void;
  onCurrencyChange: (value: string) => void;
}

const CostInputs: React.FC<CostInputsProps> = ({
  cost,
  currency,
  onCostChange,
  onCurrencyChange,
}) => {
  const handleCostChange = (value: string) => {
    const parsedValue = parseCost(value);
    onCostChange(parsedValue);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="cost">Total Cost</Label>
        <Input
          id="cost"
          type="text"
          value={formatCost(cost)}
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
