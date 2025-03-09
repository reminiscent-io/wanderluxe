
import { useState, useEffect } from 'react';

// Default exchange rates (as fallback)
const DEFAULT_RATES = {
  USD: 1,
  EUR: 0.93,
  GBP: 0.79,
  JPY: 151.73,
  AUD: 1.52,
  CAD: 1.37
};

// Currency symbols mapping
export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$'
};

export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string, rates: Record<string, number> = DEFAULT_RATES): number {
  if (fromCurrency === toCurrency) return amount;
  
  // Convert to USD first (our base currency)
  const amountInUSD = fromCurrency === 'USD' ? amount : amount / rates[fromCurrency];
  
  // Then convert from USD to target currency
  return toCurrency === 'USD' ? amountInUSD : amountInUSD * rates[toCurrency];
}

export function useCurrencyRates() {
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_RATES);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // You can replace this with a real API call to fetch exchange rates
      // For example: const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      
      // For now, we'll use our default rates
      setRates(DEFAULT_RATES);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError('Failed to fetch currency rates');
      console.error('Error fetching currency rates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch rates on component mount
  useEffect(() => {
    fetchRates();
    // You could add a refresh interval here if needed
    // const interval = setInterval(fetchRates, 24 * 60 * 60 * 1000); // once a day
    // return () => clearInterval(interval);
  }, []);

  return { rates, lastUpdated, isLoading, error, refreshRates: fetchRates };
}
