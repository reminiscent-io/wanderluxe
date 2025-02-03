import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CurrencySelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onValueChange,
  className
}) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USD">USD</SelectItem>
        <SelectItem value="EUR">EUR</SelectItem>
        <SelectItem value="GBP">GBP</SelectItem>
        <SelectItem value="JPY">JPY</SelectItem>
        <SelectItem value="AUD">AUD</SelectItem>
        <SelectItem value="CAD">CAD</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;