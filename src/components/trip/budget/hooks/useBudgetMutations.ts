
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExpenseData {
  trip_id: string;
  description: string;
  cost?: number;
  currency?: string;
  date?: string;
}

export const useBudgetMutations = (tripId: string) => {
  const queryClient = useQueryClient();

  const addExpense = useMutation({
    mutationFn: async (data: ExpenseData) => {
      const { error } = await supabase
        .from('other_expenses')
        .insert([data]);

      if (error) throw error;
    },
    onMutate: async (newExpense) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['expenses', tripId] });

      // Snapshot the previous value
      const previousExpenses = queryClient.getQueryData(['expenses', tripId]);

      // Optimistically update to the new value
      queryClient.setQueryData(['expenses', tripId], (old: any) => {
        if (!old) return old;
        
        const optimisticExpense = {
          id: `temp-${Date.now()}`,
          trip_id: newExpense.trip_id,
          category: 'Other',
          description: newExpense.description,
          cost: newExpense.cost,
          currency: newExpense.currency,
          is_paid: false,
          created_at: new Date().toISOString(),
          date: newExpense.date || new Date().toISOString().split('T')[0]
        };

        return {
          ...old,
          items: [...(old.items || []), optimisticExpense]
        };
      });

      // Return a context object with the snapshotted value
      return { previousExpenses };
    },
    onError: (err, newExpense, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['expenses', tripId], context?.previousExpenses);
      console.error('Error adding expense:', err);
      toast.error('Failed to add expense');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
    onSuccess: () => {
      toast.success('Expense added successfully');
    }
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExpenseData> }) => {
      const { error } = await supabase
        .from('expenses')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      toast.success('Expense updated successfully');
    },
    onError: (error) => {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense');
    }
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      toast.success('Expense deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  });

  return {
    addExpense,
    updateExpense,
    deleteExpense
  };
};
