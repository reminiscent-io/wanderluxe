
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from 'sonner';
import { ExpenseItem, mapToExpenseItems, formatCurrency } from './budget/utils/budgetCalculations';
import ExpenseTable from './budget/ExpenseTable';
import BudgetHeader from './budget/BudgetHeader';
import AddExpenseDialog from './budget/AddExpenseDialog';
import { useCurrencyState } from './budget/hooks/useCurrencyState';

interface BudgetViewProps {
  tripId: string;
}

const BudgetView: React.FC<BudgetViewProps> = ({ tripId }) => {
  const queryClient = useQueryClient();
  const { selectedCurrency, handleCurrencyChange } = useCurrencyState();
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Fetch all expense data
  const { data: expenses } = useQuery({
    queryKey: ['expenses', tripId],
    queryFn: async () => {
      const [
        { data: activities },
        { data: accommodations },
        { data: transportation },
        { data: restaurants },
        { data: otherExpenses },
        { data: exchangeRates }
      ] = await Promise.all([
        supabase.from('day_activities').select('*').eq('trip_id', tripId),
        supabase.from('accommodations').select('*').eq('trip_id', tripId),
        supabase.from('transportation_events').select('*').eq('trip_id', tripId),
        supabase.from('restaurant_reservations').select('*').eq('trip_id', tripId),
        supabase.from('other_expenses').select('*').eq('trip_id', tripId),
        supabase.from('exchange_rates').select('*')
      ]);

      const mappedExpenses = mapToExpenseItems(
        activities || [],
        accommodations || [],
        transportation || [],
        restaurants || [],
        otherExpenses || []
      );

      return {
        items: mappedExpenses,
        exchangeRates: exchangeRates || []
      };
    }
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (data: { 
      description: string; 
      cost: number; 
      date?: string;
      currency: string;
      isPaid: boolean;
    }) => {
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
      let table = '';
      let idField = 'id';
      let paidField = 'is_paid';
      
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
        .update({ [paidField]: isPaid })
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

  const handleAddExpense = async (data: { 
    description: string; 
    cost: number; 
    date?: string;
    currency: string;
    isPaid: boolean;
  }) => {
    await addExpenseMutation.mutateAsync(data);
  };

  const handleUpdatePaidStatus = (id: string, isPaid: boolean, category: string) => {
    updatePaidStatusMutation.mutate({ id, isPaid, category });
  };

  const total = expenses?.items.reduce((sum, item) => sum + (item.cost || 0), 0) || 0;
  const paidTotal = expenses?.items.reduce((sum, item) => sum + (item.isPaid ? (item.cost || 0) : 0), 0) || 0;

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
