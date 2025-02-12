
import { useState } from 'react';

export const useCurrencyState = (initialCurrency: string = 'USD') => {
  const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency);
  
  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
  };

  return { selectedCurrency, handleCurrencyChange };
};
