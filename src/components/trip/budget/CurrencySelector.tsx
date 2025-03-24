import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CURRENCY_SYMBOLS } from './utils/currencyConverter';

import { CURRENCIES, CURRENCY_NAMES } from '@/utils/currencyConstants';

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
      <SelectTrigger className={`w-[180px] rounded-lg px-3 py-2 text-sm bg-sand-50 border border-gray-200 ${className}`}>
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent>
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