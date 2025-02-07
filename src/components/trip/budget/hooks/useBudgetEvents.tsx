
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Expense, ExchangeRate } from '@/integrations/supabase/types';
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

  const handleDeleteExpense = async (id: string, category: string) => {
    if (!tripId) return;
    
    try {
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
      toast.success('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const handleUpdateCost = async (id: string, category: string, cost: number, currency: string) => {
    if (!tripId) return;
    
    try {
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
      toast.success('Cost updated successfully');
    } catch (error) {
      console.error('Error updating cost:', error);
      toast.error('Failed to update cost');
    }
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
