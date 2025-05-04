
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExpenseData {
  trip_id: string;
  category: string;
  description: string;
  cost?: number;
  currency?: string;
  is_paid?: boolean;
  accommodation_id?: string;
  transportation_id?: string;
  activity_id?: string;
}

export const useBudgetMutations = (tripId: string) => {
  const queryClient = useQueryClient();

  const addExpense = useMutation({
    mutationFn: async (data: ExpenseData) => {
      const { error } = await supabase
        .from('expenses')
        .insert([data]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      toast.success('Expense added successfully');
    },
    onError: (error) => {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
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
