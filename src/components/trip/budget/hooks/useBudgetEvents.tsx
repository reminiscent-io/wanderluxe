import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { TimelineEvent } from '@/types/trip';

export const useBudgetEvents = (tripId: string | undefined) => {
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ['timeline-events', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await supabase
        .from('timeline_events')
        .select('*, day_activities(*)')
        .eq('trip_id', tripId)
        .order('date', { ascending: true });

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
      const usedCurrencies = new Set<string>();
      events?.forEach(event => {
        if (event.currency) usedCurrencies.add(event.currency);
        event.day_activities?.forEach(activity => {
          if (activity.currency) usedCurrencies.add(activity.currency);
        });
      });

      // Fetch exchange rates for used currencies
      const rates = await Promise.all(
        Array.from(usedCurrencies).map(async (currency) => {
          const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${currency}`);
          const data = await response.json();
          return { currency, rate: data.rates };
        })
      );

      const ratesMap = rates.reduce((acc, { currency, rate }) => {
        acc[currency] = rate;
        return acc;
      }, {} as Record<string, number>);

      setExchangeRates(ratesMap);
    };

    if (events?.length) {
      fetchExchangeRates();
    }
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