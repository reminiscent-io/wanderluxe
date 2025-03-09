import { useState, useEffect } from 'react';
import { useCurrencyRates } from '../utils/currencyConverter';

export function useCurrencyState(initialCurrency = 'USD') {
  const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency);
  const { rates, lastUpdated, isLoading, error, refreshRates } = useCurrencyRates();

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
  };

  return {
    selectedCurrency,
    handleCurrencyChange,
    rates,
    lastUpdated,
    isLoading,
    error,
    refreshRates
  };
}