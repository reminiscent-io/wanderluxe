import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PIVOT_CURRENCY, type RateTable } from './currencyMath';

export { getConversionRate, convertCurrency, PIVOT_CURRENCY } from './currencyMath';
export type { RateTable } from './currencyMath';

// Type for exchange rate data from database
type ExchangeRate = {
  currency_from: string;
  currency_to: string;
  rate: number | string;
  last_updated: string;
};

const isUsableRate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export function useCurrencyRates() {
  const [rates, setRates] = useState<RateTable>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  // Starts true: a fetch is kicked off on mount, and callers must not read an
  // empty rate table as "no rate exists" before it settles.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Only USD-anchored rows. The table holds thousands of pairs and an
      // unfiltered select silently truncates at PostgREST's row cap — which is
      // how the USD/EUR/JPY rows went missing and conversion turned into a
      // no-op. This slice is ~150 rows, refreshed daily, and covers every
      // currency in the app (including ones outside the picker, e.g. MAD/ZAR).
      const { data, error: fetchError } = await supabase
        .from('exchange_rates')
        .select('currency_from, currency_to, rate, last_updated')
        .or(`currency_from.eq.${PIVOT_CURRENCY},currency_to.eq.${PIVOT_CURRENCY}`);

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        throw new Error('No exchange rates found in database');
      }

      // Transform the flat array into nested object structure, enforcing
      // uppercase keys and numeric rates (numeric columns can arrive as text).
      const ratesMap: RateTable = {};
      let newest: string | null = null;

      (data as ExchangeRate[]).forEach(row => {
        const rate = typeof row.rate === 'number' ? row.rate : Number(row.rate);
        if (!isUsableRate(rate)) return;

        const from = row.currency_from.toUpperCase();
        const to = row.currency_to.toUpperCase();
        if (!ratesMap[from]) ratesMap[from] = {};
        ratesMap[from][to] = rate;

        if (row.last_updated && (!newest || row.last_updated > newest)) {
          newest = row.last_updated;
        }
      });

      setRates(ratesMap);
      setLastUpdated(newest);
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
