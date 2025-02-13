
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

// Define table types explicitly to avoid deep type inference
type TableName = 'accommodations' | 'transportation_events' | 'day_activities' | 'restaurant_reservations' | 'other_expenses';
type IdField = 'id' | 'stay_id';

interface UpdatePaidStatusParams {
  id: string;
  isPaid: boolean;
  category: string;
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
      let table: TableName;
      let idField: IdField = 'id';
      
      switch (category) {
        case 'Accommodations':
          table = 'accommodations';
          idField = 'stay_id';
          break;
        case 'Transportation':
          table = 'transportation_events';
          break;
        case 'Activities':
          table = 'day_activities';
          break;
        case 'Dining':
          table = 'restaurant_reservations';
          break;
        case 'Other':
          table = 'other_expenses';
          break;
        default:
          throw new Error('Invalid category');
      }

      const { error } = await supabase
        .from(table)
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
