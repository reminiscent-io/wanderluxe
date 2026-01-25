
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CURRENCIES, CURRENCY_NAMES, CURRENCY_SYMBOLS } from '@/utils/currencyConstants';

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
  // Show symbol for selected value, or "$" as default placeholder
  const displayValue = value
    ? `${value} ${CURRENCY_SYMBOLS[value as keyof typeof CURRENCY_SYMBOLS] || ''}`
    : undefined;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`w-auto min-w-[80px] rounded-lg px-3 py-2 text-sm bg-sand-50 border border-gray-200 ${className}`}>
        <SelectValue placeholder="$">{displayValue}</SelectValue>
      </SelectTrigger>
      <SelectContent className="z-[9999]">
        {CURRENCIES.map(currency => (
          <SelectItem key={currency} value={currency}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    {currency} {CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS]}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{CURRENCY_NAMES[currency as keyof typeof CURRENCY_NAMES]}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;
