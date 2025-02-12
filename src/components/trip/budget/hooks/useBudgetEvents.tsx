
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Expense, ExchangeRate } from '@/integrations/supabase/types/models';
import { toast } from 'sonner';

export const useBudgetEvents = (tripId: string | undefined) => {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ['expenses', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId);

      if (error) {
        console.error('Error fetching expenses:', error);
        throw error;
      }
      return data as Expense[];
    },
    enabled: !!tripId
  });

  useEffect(() => {
    const fetchExchangeRates = async () => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*');

      if (error) {
        console.error('Error fetching exchange rates:', error);
        return;
      }

      setExchangeRates(data);
      setLastUpdated(data[0]?.last_updated || null);
    };

    fetchExchangeRates();
  }, []);

  return {
    events,
    exchangeRates,
    lastUpdated
  };
};
