import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"];
const EXPENSE_TYPES = ["accommodation", "transportation", "activities", "other"];

interface ExpenseFieldsProps {
  expenseType: string;
  expenseCost: string;
  expenseCurrency: string;
  onExpenseTypeChange: (value: string) => void;
  onExpenseCostChange: (value: string) => void;
  onExpenseCurrencyChange: (value: string) => void;
}

const ExpenseFields: React.FC<ExpenseFieldsProps> = ({
  expenseType,
  expenseCost,
  expenseCurrency,
  onExpenseTypeChange,
  onExpenseCostChange,
  onExpenseCurrencyChange
}) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label htmlFor="expense_type">Expense Type</Label>
        <Select
          value={expenseType}
          onValueChange={onExpenseTypeChange}
        >
          <SelectTrigger className="bg-white border-gray-200">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200 shadow-lg">
            {EXPENSE_TYPES.map((type) => (
              <SelectItem 
                key={type} 
                value={type}
                className="hover:bg-gray-100"
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="expense_cost">Cost</Label>
        <Input
          id="expense_cost"
          type="number"
          step="0.01"
          value={expenseCost}
          onChange={(e) => onExpenseCostChange(e.target.value)}
          placeholder="Enter cost"
        />
      </div>
      <div>
        <Label htmlFor="expense_currency">Currency</Label>
        <Select
          value={expenseCurrency}
          onValueChange={onExpenseCurrencyChange}
        >
          <SelectTrigger className="bg-white border-gray-200">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200 shadow-lg">
            {CURRENCIES.map((currency) => (
              <SelectItem 
                key={currency} 
                value={currency}
                className="hover:bg-gray-100"
              >
                {currency}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ExpenseFields;