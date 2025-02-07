
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CostInputsProps {
  expenseCost: string;
  currency: string;
  onCostChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  formatCost: (value: string) => string;
}

const CostInputs: React.FC<CostInputsProps> = ({
  expenseCost,
  currency,
  onCostChange,
  onCurrencyChange,
  formatCost
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="expense_cost">Total Cost</Label>
        <Input
          id="expense_cost"
          type="text"
          value={expenseCost}
          onChange={(e) => onCostChange(e.target.value)}
          onBlur={(e) => onCostChange(formatCost(e.target.value))}
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
