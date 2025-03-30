import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CURRENCIES } from '@/utils/currencyConstants';

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
  // Force uppercase for consistency
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (!amount || from === to) return amount;

  // Direct conversion: if a rate from 'from' to 'to' exists, use it
  if (rates[from]?.[to]) {
    return amount * rates[from][to];
  }

  // Reverse conversion: if a rate from 'to' to 'from' exists, invert it
  if (rates[to]?.[from]) {
    return amount * (1 / rates[to][from]);
  }

  console.warn(`No conversion rate found for ${fromCurrency} to ${toCurrency}`);
  return amount;
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

      console.log('Fetched exchange rates:', data);

      if (!data || data.length === 0) {
        throw new Error('No exchange rates found in database');
      }

      // Transform the flat array into nested object structure, enforcing uppercase keys
      const ratesMap: Record<string, Record<string, number>> = {};
      (data as ExchangeRate[]).forEach(rate => {
        const from = rate.currency_from.toUpperCase();
        const to = rate.currency_to.toUpperCase();
        if (!ratesMap[from]) {
          ratesMap[from] = {};
        }
        ratesMap[from][to] = rate.rate;
      });

      console.log('Transformed rates map:', ratesMap);

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
