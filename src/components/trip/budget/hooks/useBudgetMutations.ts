
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddExpenseData {
  description: string;
  cost: number;
  date?: string;
  currency: string;
  isPaid: boolean;
}

// Define explicit type for category
type ExpenseCategory = 'Accommodations' | 'Transportation' | 'Activities' | 'Dining' | 'Other';

// Define table names explicitly
type TableName = 'accommodations' | 'transportation_events' | 'day_activities' | 'restaurant_reservations' | 'other_expenses';

interface UpdatePaidStatusParams {
  id: string;
  isPaid: boolean;
  category: ExpenseCategory;
}

export const useBudgetMutations = (tripId: string) => {
  const queryClient = useQueryClient();

  const addExpenseMutation = useMutation({
    mutationFn: async (data: AddExpenseData) => {
      const { error } = await supabase.from('other_expenses').insert({
        trip_id: tripId,
        description: data.description,
        cost: data.cost,
        currency: data.currency,
        date: data.date,
        is_paid: data.isPaid
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      toast.success('Expense added successfully');
    },
    onError: () => {
      toast.error('Failed to add expense');
    }
  });

  const updatePaidStatusMutation = useMutation({
    mutationFn: async ({ id, isPaid, category }: UpdatePaidStatusParams) => {
      let tableName: TableName;
      let idField: 'id' | 'stay_id' = 'id';
      
      switch (category) {
        case 'Accommodations':
          tableName = 'accommodations';
          idField = 'stay_id';
          break;
        case 'Transportation':
          tableName = 'transportation_events';
          break;
        case 'Activities':
          tableName = 'day_activities';
          break;
        case 'Dining':
          tableName = 'restaurant_reservations';
          break;
        case 'Other':
          tableName = 'other_expenses';
          break;
        default:
          throw new Error('Invalid category');
      }

      const { error } = await supabase
        .from(tableName)
        .update({ is_paid: isPaid })
        .eq(idField, id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      toast.success('Payment status updated');
    },
    onError: () => {
      toast.error('Failed to update payment status');
    }
  });

  return {
    addExpenseMutation,
    updatePaidStatusMutation
  };
};
