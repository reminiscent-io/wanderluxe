import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { TimelineEvent } from '@/types/trip';

export const useBudgetEvents = (tripId: string) => {
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  const { data: events } = useQuery({
    queryKey: ['timeline-events', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timeline_events')
        .select('*, day_activities(*)')
        .eq('trip_id', tripId)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as TimelineEvent[];
    }
  });

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

  return { events, exchangeRates };
};
