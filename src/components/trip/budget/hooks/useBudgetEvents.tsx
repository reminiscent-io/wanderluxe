
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Expense } from '@/types/trip';
import { ExchangeRate } from '@/integrations/supabase/types';

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

      if (error) throw error;
      return data as Expense[];
    }
  });

  const handleDeleteExpense = async (id: string, category: string) => {
    if (!tripId) return;
    
    let table: string;
    switch (category) {
      case 'reservations':
        table = 'restaurant_reservations';
        break;
      case 'activities':
        table = 'day_activities';
        break;
      case 'transportation':
        table = 'transportation_events';
        break;
      default:
        throw new Error('Invalid category');
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    if (error) throw error;
  };

  const handleUpdateCost = async (id: string, category: string, cost: number, currency: string) => {
    if (!tripId) return;
    
    let table: string;
    switch (category) {
      case 'reservations':
        table = 'restaurant_reservations';
        break;
      case 'activities':
        table = 'day_activities';
        break;
      case 'transportation':
        table = 'transportation_events';
        break;
      default:
        throw new Error('Invalid category');
    }

    const { error } = await supabase
      .from(table)
      .update({ cost, currency })
      .eq('id', id);
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

      setExchangeRates(data);
      setLastUpdated(data[0]?.last_updated || null);
    };

    fetchExchangeRates();
  }, []);

  return {
    events,
    exchangeRates,
    lastUpdated,
    handleDeleteExpense,
    handleUpdateCost
  };
};
