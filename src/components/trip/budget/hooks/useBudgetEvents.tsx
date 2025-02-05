import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { TimelineEvent } from '@/types/trip';

export const useBudgetEvents = (tripId: string | undefined) => {
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ['timeline-events', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await supabase
        .from('timeline_events')
        .select('*, day_activities(*)')
        .eq('trip_id', tripId);

      if (error) throw error;
      return data as TimelineEvent[];
    }
  });

  const handleDeleteExpense = async (id: string) => {
    if (!tripId) return;
    const { error } = await supabase
      .from('timeline_events')
      .delete()
      .eq('id', id);
    if (error) throw error;
  };

  const handleUpdateCost = async (id: string, cost: number, currency: string) => {
    if (!tripId) return;
    const { error } = await supabase
      .from('timeline_events')
      .update({ expense_cost: cost, currency })
      .eq('id', id);
    if (error) throw error;
  };

  const handleAddExpense = async (data: any) => {
    if (!tripId) return;
    const { error } = await supabase
      .from('timeline_events')
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