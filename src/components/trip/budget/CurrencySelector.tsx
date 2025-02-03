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
      <SelectContent 
        className="bg-white w-[200px]"
        position="popper"
        side="bottom"
        align="start"
      >
        <SelectItem value="USD" className="hover:bg-earth-50 py-2">USD</SelectItem>
        <SelectItem value="EUR" className="hover:bg-earth-50 py-2">EUR</SelectItem>
        <SelectItem value="GBP" className="hover:bg-earth-50 py-2">GBP</SelectItem>
        <SelectItem value="JPY" className="hover:bg-earth-50 py-2">JPY</SelectItem>
        <SelectItem value="AUD" className="hover:bg-earth-50 py-2">AUD</SelectItem>
        <SelectItem value="CAD" className="hover:bg-earth-50 py-2">CAD</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;