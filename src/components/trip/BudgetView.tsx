
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from 'sonner';
import { ExpenseItem } from '@/types/trip';
import ExpenseTable from './budget/ExpenseTable';
import BudgetHeader from './budget/BudgetHeader';
import AddExpenseDialog from './budget/AddExpenseDialog';
import { useCurrencyState } from './budget/hooks/useCurrencyState';
import { formatCurrency } from './budget/utils/budgetCalculations';

// Define simpler, focused types
interface ActivityExpense {
  id: string;
  day_id: string;
  trip_id: string;
  title: string;
  description?: string;
  cost?: number;
  currency?: string;
  is_paid?: boolean;
  created_at: string;
}

interface AccommodationExpense {
  stay_id: string;
  trip_id: string;
  title: string;
  cost?: number;
  currency?: string;
  is_paid?: boolean;
  created_at: string;
}

interface TransportationExpense {
  id: string;
  trip_id: string;
  type: string;
  cost?: number;
  currency?: string;
  is_paid?: boolean;
  created_at: string;
}

interface RestaurantExpense {
  id: string;
  day_id: string;
  restaurant_name: string;
  cost?: number;
  currency?: string;
  is_paid?: boolean;
  created_at: string;
}

interface OtherExpense {
  id: string;
  trip_id: string;
  description: string;
  cost?: number;
  currency?: string;
  is_paid?: boolean;
  created_at: string;
}

interface BudgetViewProps {
  tripId: string;
}

const BudgetView: React.FC<BudgetViewProps> = ({ tripId }) => {
  const queryClient = useQueryClient();
  const { selectedCurrency, handleCurrencyChange } = useCurrencyState();
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Convert database expenses to ExpenseItems
  const mapToExpenseItems = (
    activities: ActivityExpense[],
    accommodations: AccommodationExpense[],
    transportation: TransportationExpense[],
    restaurants: RestaurantExpense[],
    otherExpenses: OtherExpense[]
  ): ExpenseItem[] => {
    const items: ExpenseItem[] = [];

    // Map activities
    activities.forEach(activity => {
      items.push({
        id: activity.id,
        trip_id: activity.trip_id,
        category: 'Activities',
        description: activity.title,
        cost: activity.cost,
        currency: activity.currency,
        is_paid: activity.is_paid,
        created_at: activity.created_at,
        activity_id: activity.id
      });
    });

    // Map accommodations
    accommodations.forEach(accommodation => {
      items.push({
        id: accommodation.stay_id,
        trip_id: accommodation.trip_id,
        category: 'Accommodations',
        description: accommodation.title,
        cost: accommodation.cost,
        currency: accommodation.currency,
        is_paid: accommodation.is_paid,
        created_at: accommodation.created_at,
        accommodation_id: accommodation.stay_id
      });
    });

    // Map transportation
    transportation.forEach(transport => {
      items.push({
        id: transport.id,
        trip_id: transport.trip_id,
        category: 'Transportation',
        description: transport.type,
        cost: transport.cost,
        currency: transport.currency,
        is_paid: transport.is_paid,
        created_at: transport.created_at,
        transportation_id: transport.id
      });
    });

    // Map restaurants
    restaurants.forEach(restaurant => {
      items.push({
        id: restaurant.id,
        trip_id: tripId,
        category: 'Dining',
        description: restaurant.restaurant_name,
        cost: restaurant.cost,
        currency: restaurant.currency,
        is_paid: restaurant.is_paid,
        created_at: restaurant.created_at
      });
    });

    // Map other expenses
    otherExpenses.forEach(expense => {
      items.push({
        id: expense.id,
        trip_id: expense.trip_id,
        category: 'Other',
        description: expense.description,
        cost: expense.cost,
        currency: expense.currency,
        is_paid: expense.is_paid,
        created_at: expense.created_at
      });
    });

    return items;
  };

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
