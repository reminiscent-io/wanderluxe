
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Expense, ExchangeRate } from '@/integrations/supabase/types/models';
import { toast } from 'sonner';

export const useBudgetEvents = (tripId: string | undefined) => {
  const queryClient = useQueryClient();
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

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      toast.success('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const handleUpdateCost = async (id: string, cost: number, currency: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ cost, currency })
        .eq('id', id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      toast.success('Expense updated successfully');
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense');
    }
  };

  return {
    events,
    exchangeRates,
    lastUpdated,
    handleDeleteExpense,
    handleUpdateCost
  };
};
