import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Accomodation } from '@/types/trip';

export const useBudgetEvents = (tripId: string | undefined) => {
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ['accommodations', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await supabase
        .from('accommodations')
        .select('*, day_activities(*)')
        .eq('trip_id', tripId);

      if (error) throw error;
      return data as Accomodation[];
    }
  });

  const handleDeleteExpense = async (stay_id: string) => {
    if (!tripId) return;
    const { error } = await supabase
      .from('accommodations')
      .delete()
      .eq('stay_id', id);
    if (error) throw error;
  };

  const handleUpdateCost = async (stay_id: string, expense_cost: number, currency: string) => {
    if (!tripId) return;
    const { error } = await supabase
      .from('accommodations')
      .update({ expense_cost: cost, currency })
      .eq('stay_id', stay_id);
    if (error) throw error;
  };

  const handleAddExpense = async (data: any) => {
    if (!tripId) return;
    const { error } = await supabase
      .from('accommodations')
      .insert([{ ...data, trip_id: tripId }]);
    if (error) throw error;
  };

  useEffect(() => {
    const fetchExchangeRates = async () => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*');

      if (error) {
        console.error('Error fetching exchange rates:', error);
        return;
      }

      const rates: Record<string, number> = {};
      data.forEach(rate => {
        rates[rate.currency_from] = rate.rate;
      });
      setExchangeRates(rates);
      setLastUpdated(data[0]?.last_updated || null);
    };

    fetchExchangeRates();
  }, [events]);

  return {
    events,
    exchangeRates,
    lastUpdated,
    handleDeleteExpense,
    handleUpdateCost,
    handleAddExpense
  };
};
