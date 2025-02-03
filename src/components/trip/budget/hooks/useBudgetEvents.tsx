import { useState, useEffect } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useBudgetEvents = (tripId: string | undefined) => {
  const queryClient = useQueryClient();
  const { events } = useTimelineEvents(tripId);
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetchExchangeRates = async () => {
      const usedCurrencies = new Set<string>();
      events?.forEach(event => {
        if (event.expense_currency) usedCurrencies.add(event.expense_currency);
        event.activities?.forEach(activity => {
          if (activity.currency) usedCurrencies.add(activity.currency);
        });
      });

      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .in('currency_from', Array.from(usedCurrencies))
        .eq('currency_to', 'USD');

      if (error) {
        console.error('Error fetching exchange rates:', error);
      } else if (data && data.length > 0) {
        setExchangeRates(data);
        setLastUpdated(data[0].last_updated);
      }
    };

    fetchExchangeRates();
  }, [events]);

  const handleDeleteExpense = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('timeline_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      toast.success('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const handleUpdateCost = async (eventId: string, cost: number, currency: string) => {
    try {
      const { error } = await supabase
        .from('timeline_events')
        .update({ 
          expense_cost: cost,
          expense_currency: currency
        })
        .eq('id', eventId);

      if (error) throw error;
      toast.success('Cost updated successfully');
    } catch (error) {
      console.error('Error updating cost:', error);
      toast.error('Failed to update cost');
    }
  };

  const handleAddExpense = async (
    category: string,
    title: string,
    amount: number,
    currency: string,
    isPaid: boolean,
    date: string | null
  ) => {
    try {
      if (!tripId) throw new Error('No trip ID provided');
      
      const { data, error } = await supabase
        .from('timeline_events')
        .insert([{
          trip_id: tripId,
          title: title,
          date: date || format(new Date(), 'yyyy-MM-dd'),
          order_index: events?.length || 0,
          expense_type: category.toLowerCase(),
          expense_cost: amount,
          expense_currency: currency,
          expense_paid: isPaid,
          expense_date: date
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Expense added successfully');
      return true;
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
      return false;
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('timeline-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_events',
          filter: `trip_id=eq.${tripId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['timeline-events', tripId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  return {
    events,
    exchangeRates,
    lastUpdated,
    handleDeleteExpense,
    handleUpdateCost,
    handleAddExpense
  };
};