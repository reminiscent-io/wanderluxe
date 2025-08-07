import React, { useState, useMemo, useEffect } from 'react';
import ExpenseTable from './budget/ExpenseTable';
import BudgetHeader from './budget/BudgetHeader';
import AddExpenseDialog from './budget/AddExpenseDialog';
import { useCurrencyState } from './budget/hooks/useCurrencyState';
import { useExpenses } from './budget/hooks/useExpenses';
import { useBudgetMutations } from './budget/hooks/useBudgetMutations';
import BudgetSummary from './budget/components/BudgetSummary';
import ExpenseActions from './budget/components/ExpenseActions';
import { convertCurrency } from './budget/utils/currencyConverter';
import { useBudgetEvents } from './budget/hooks/useBudgetEvents';
import { useTripQuery } from '@/hooks/useTripQuery';
import { useAuth } from '@/contexts/AuthContext';

interface AddExpenseData {
  description: string;
  cost: number;
  date?: string;
  currency: string;
}

interface BudgetViewProps {
  tripId: string;
}

const BudgetView: React.FC<BudgetViewProps> = ({ tripId }) => {
  const { selectedCurrency, handleCurrencyChange, lastUpdated: currencyLastUpdated } = useCurrencyState();
  const { data: expenses } = useExpenses(tripId);
  const { addExpense, updateExpense } = useBudgetMutations(tripId);
  const { trip } = useTripQuery(tripId);
  const { user } = useAuth();
  // Use the hook that provides expenses and exchange rates
  const { exchangeRates, lastUpdated } = useBudgetEvents(tripId);

  useEffect(() => {
    if (tripId) {
      trackBudgetPageView(tripId);
    }
  }, [tripId]);

  const trackBudgetPageView = async (tripId: string) => {
    try {
      if (user) {
        // Track in Google Analytics
        window.gtag('event', 'budget_page_view', {
          event_category: 'Budget',
          event_label: tripId,
          user_id: user.id
        });

        console.log('Budget page viewed by user:', user.id, 'for trip:', tripId);
      }
    } catch (error) {
      console.error('Error tracking budget page view:', error);
    }
  };

  // Transform the exchangeRates array into an object:
  // { currency_from: { currency_to: rate, ... }, ... }
  const ratesObject = useMemo(() => {
    if (!exchangeRates || exchangeRates.length === 0) return {};
    const obj: Record<string, Record<string, number>> = {};
    exchangeRates.forEach((rate) => {
      // Use the correct field names: currency_from and currency_to
      const from = rate.currency_from;
      const to = rate.currency_to;
      if (!obj[from]) {
        obj[from] = {};
      }
      obj[from][to] = rate.rate;
    });
    return obj;
  }, [exchangeRates]);

  // Convert expenses to selected currency using the rates from the hook
  const convertedExpenses = useMemo(() => {
    if (!expenses?.items || !Object.keys(ratesObject).length) return [];
    return expenses.items.map(expense => ({
      ...expense,
      convertedCost: convertCurrency(
        expense.cost || 0,
        expense.currency || 'USD',
        selectedCurrency,
        ratesObject
      )
    }));
  }, [expenses?.items, selectedCurrency, ratesObject]);

  const handleAddExpense = async (data: AddExpenseData) => {
    try {
      await addExpense.mutateAsync({
        trip_id: tripId,
        description: data.description,
        cost: data.cost,
        currency: data.currency,
        date: data.date
      });

      // Track expense addition in Google Analytics
      if (user) {
        window.gtag('event', 'expense_added', {
          event_category: 'Budget',
          event_label: tripId,
          user_id: user.id,
          value: data.cost
        });

        console.log('Expense added by user:', user.id, 'for trip:', tripId, 'amount:', data.cost);
      }

      setIsAddingExpense(false);
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  // Remove the paid status update function since we've deprecated the is_paid feature

  // Calculate totals using converted values
  const total = convertedExpenses.reduce((sum, item) => sum + item.convertedCost, 0);

  const [isAddingExpense, setIsAddingExpense] = useState(false);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6">
      <BudgetHeader
        selectedCurrency={selectedCurrency}
        onCurrencyChange={handleCurrencyChange}
        lastUpdated={lastUpdated || currencyLastUpdated}
      />

      <BudgetSummary
        total={total}
        selectedCurrency={selectedCurrency}
      />

      <ExpenseActions onAddExpense={() => setIsAddingExpense(true)} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div data-lov-id="budget-card">
          {convertedExpenses.length > 0 && (
            <ExpenseTable
              expenses={convertedExpenses}
              selectedCurrency={selectedCurrency}
            />
          )}
        </div>
      </div>

      <AddExpenseDialog
        open={isAddingExpense}
        onOpenChange={setIsAddingExpense}
        onSubmit={handleAddExpense}
        defaultCurrency={selectedCurrency}
        defaultDate={trip?.arrival_date}
      />
    </div>
  );
};

export default BudgetView;
