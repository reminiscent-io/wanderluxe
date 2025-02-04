import { useState } from 'react';

export const useCurrencyState = (initialCurrency: string = 'USD') => {
  const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency);
  return { selectedCurrency, setSelectedCurrency };
};