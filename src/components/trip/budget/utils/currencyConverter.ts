
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CURRENCIES, type Currency } from '@/utils/currencyConstants';

// Type for exchange rate data from database
type ExchangeRate = {
  currency_from: string;
  currency_to: string;
  rate: number;
  last_updated: string;
};

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, Record<string, number>>
): number {
  if (!amount || fromCurrency === toCurrency) return amount;
  if (!rates[fromCurrency]?.[toCurrency]) return amount;
  
  return amount * rates[fromCurrency][toCurrency];
}

export function useCurrencyRates() {
  const [rates, setRates] = useState<Record<string, Record<string, number>>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('exchange_rates')
        .select('*')
        .in('currency_from', CURRENCIES)
        .in('currency_to', CURRENCIES);

      if (fetchError) throw fetchError;

      // Transform the flat array into nested object structure
      const ratesMap: Record<string, Record<string, number>> = {};
      (data as ExchangeRate[]).forEach(rate => {
        if (!ratesMap[rate.currency_from]) {
          ratesMap[rate.currency_from] = {};
        }
        ratesMap[rate.currency_from][rate.currency_to] = rate.rate;
      });

      setRates(ratesMap);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('Error fetching currency rates:', err);
      setError('Failed to fetch currency rates');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch rates on component mount
  useEffect(() => {
    fetchRates();
    
    // Set up real-time subscription for rate updates
    const subscription = supabase
      .channel('exchange_rates_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'exchange_rates'
      }, () => {
        fetchRates();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { rates, lastUpdated, isLoading, error, refreshRates: fetchRates };
}
