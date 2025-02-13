
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from 'sonner';
import ExpenseTable from './budget/ExpenseTable';
import BudgetHeader from './budget/BudgetHeader';
import AddExpenseDialog from './budget/AddExpenseDialog';
import { useCurrencyState } from './budget/hooks/useCurrencyState';
import { formatCurrency } from './budget/utils/budgetCalculations';
import { Tables } from '@/integrations/supabase/types';

// Use database types directly to avoid complex type hierarchies
type DbActivity = Tables<'day_activities'>;
type DbAccommodation = Tables<'accommodations'>;
type DbTransportation = Tables<'transportation_events'>;
type DbRestaurant = Tables<'restaurant_reservations'>;
type DbOtherExpense = Tables<'other_expenses'>;

// Simplified expense interface
interface SimplifiedExpense {
  id: string;
  trip_id: string;
  category: string;
  description: string;
  cost: number | null;
  currency: string | null;
  is_paid: boolean;
  created_at: string;
  activity_id?: string;
  accommodation_id?: string;
  transportation_id?: string;
}

interface AddExpenseData {
  description: string;
  cost: number;
  date?: string;
  currency: string;
  isPaid: boolean;
}

interface BudgetViewProps {
  tripId: string;
}

const BudgetView: React.FC<BudgetViewProps> = ({ tripId }) => {
  const queryClient = useQueryClient();
  const { selectedCurrency, handleCurrencyChange } = useCurrencyState();
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  const { data: expenses } = useQuery({
    queryKey: ['expenses', tripId],
    queryFn: async () => {
      const [
        { data: activities },
        { data: accommodations },
        { data: transportation },
        { data: restaurants },
        { data: otherExpenses }
      ] = await Promise.all([
        supabase.from('day_activities').select('*').eq('trip_id', tripId),
        supabase.from('accommodations').select('*').eq('trip_id', tripId),
        supabase.from('transportation_events').select('*').eq('trip_id', tripId),
        supabase.from('restaurant_reservations').select('*').eq('trip_id', tripId),
        supabase.from('other_expenses').select('*').eq('trip_id', tripId),
      ]);

      const mappedExpenses: SimplifiedExpense[] = [
        ...(activities || []).map((act: DbActivity) => ({
          id: act.id,
          trip_id: act.trip_id,
          category: 'Activities',
          description: act.title,
          cost: act.cost,
          currency: act.currency,
          is_paid: act.is_paid || false,
          created_at: act.created_at,
          activity_id: act.id
        })),
        ...(accommodations || []).map((acc: DbAccommodation) => ({
          id: acc.stay_id,
          trip_id: acc.trip_id,
          category: 'Accommodations',
          description: acc.title,
          cost: acc.cost,
          currency: acc.currency,
          is_paid: acc.is_paid || false,
          created_at: acc.created_at,
          accommodation_id: acc.stay_id
        })),
        ...(transportation || []).map((trans: DbTransportation) => ({
          id: trans.id,
          trip_id: trans.trip_id,
          category: 'Transportation',
          description: trans.type,
          cost: trans.cost,
          currency: trans.currency,
          is_paid: trans.is_paid || false,
          created_at: trans.created_at,
          transportation_id: trans.id
        })),
        ...(restaurants || []).map((rest: DbRestaurant) => ({
          id: rest.id,
          trip_id: tripId,
          category: 'Dining',
          description: rest.restaurant_name,
          cost: rest.cost,
          currency: rest.currency,
          is_paid: rest.is_paid || false,
          created_at: rest.created_at
        })),
        ...(otherExpenses || []).map((expense: DbOtherExpense) => ({
          id: expense.id,
          trip_id: expense.trip_id,
          category: 'Other',
          description: expense.description,
          cost: expense.cost,
          currency: expense.currency,
          is_paid: expense.is_paid,
          created_at: expense.created_at
        }))
      ];

      return {
        items: mappedExpenses,
        exchangeRates: [] // Simplified for now
      };
    },
    enabled: !!tripId
  });

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
    mutationFn: async ({ id, isPaid, category }: { id: string; isPaid: boolean; category: string }) => {
      let table: 'accommodations' | 'transportation_events' | 'day_activities' | 'restaurant_reservations' | 'other_expenses';
      let idField: 'id' | 'stay_id' = 'id';
      
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

  const handleAddExpense = async (data: AddExpenseData) => {
    await addExpenseMutation.mutateAsync(data);
  };

  const handleUpdatePaidStatus = (id: string, isPaid: boolean, category: string) => {
    updatePaidStatusMutation.mutate({ id, isPaid, category });
  };

  const total = expenses?.items.reduce((sum, item) => sum + (item.cost || 0), 0) || 0;
  const paidTotal = expenses?.items.reduce((sum, item) => sum + (item.is_paid ? (item.cost || 0) : 0), 0) || 0;

  return (
    <div className="space-y-6">
      <BudgetHeader
        selectedCurrency={selectedCurrency}
        onCurrencyChange={handleCurrencyChange}
        lastUpdated={null}
      />

      <div className="flex justify-between items-center bg-sand-50 p-4 rounded-lg shadow">
        <div className="space-y-1">
          <p className="text-sm text-gray-500">Total Budget</p>
          <p className="text-2xl font-bold text-earth-600">
            {formatCurrency(total, selectedCurrency)}
          </p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-sm text-gray-500">Paid / Unpaid</p>
          <p className="text-earth-600">
            {formatCurrency(paidTotal, selectedCurrency)} / {formatCurrency(total - paidTotal, selectedCurrency)}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => setIsAddingExpense(true)}
          className="bg-earth-500 hover:bg-earth-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Other Expense
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {expenses?.items && (
          <ExpenseTable
            expenses={expenses.items}
            selectedCurrency={selectedCurrency}
            onUpdatePaidStatus={handleUpdatePaidStatus}
          />
        )}
      </div>

      <AddExpenseDialog
        open={isAddingExpense}
        onOpenChange={setIsAddingExpense}
        onSubmit={handleAddExpense}
        defaultCurrency={selectedCurrency}
      />
    </div>
  );
};

export default BudgetView;
