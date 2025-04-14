import React, { useState, useMemo } from 'react';
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
  const { selectedCurrency, handleCurrencyChange, lastUpdated: currencyLastUpdated } = useCurrencyState();
  const { data: expenses } = useExpenses(tripId);
  const { addExpense, updateExpense } = useBudgetMutations(tripId);
  const { exchangeRates, lastUpdated } = useBudgetEvents(tripId);

  // Transform exchangeRates array into an object: { currency_from: { currency_to: rate, ... }, ... }
  const ratesObject = useMemo(() => {
    if (!exchangeRates || exchangeRates.length === 0) return {};
    const obj: Record<string, Record<string, number>> = {};
    exchangeRates.forEach((rate) => {
      const from = rate.currency_from;
      const to = rate.currency_to;
      if (!obj[from]) {
        obj[from] = {};
      }
      obj[from][to] = rate.rate;
    });
    return obj;
  }, [exchangeRates]);

  // Convert expenses to the selected currency using rates
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
    await addExpense.mutateAsync({
      trip_id: tripId,
      description: data.description,
      cost: data.cost,
      currency: data.currency,
      is_paid: data.isPaid,
      category: 'Other' // Default category for manually added expenses
    });
    setIsAddingExpense(false);
  };

  // Update function for saving the amount paid
  const handleUpdatePaidAmount = (id: string, amountPaid: number, category: string) => {
    updateExpense.mutate({
      id,
      data: {
        amount_paid: amountPaid,
        category: category // Preserve the category when updating
      }
    });
  };

  // Calculate totals using converted values
  const total = convertedExpenses.reduce((sum, item) => sum + item.convertedCost, 0);
  const paidTotal = convertedExpenses.reduce(
    (sum, item) => sum + (item.is_paid ? item.convertedCost : 0),
    0
  );

  const [isAddingExpense, setIsAddingExpense] = useState(false);

  return (
    <div className="space-y-6">
      <BudgetHeader
        selectedCurrency={selectedCurrency}
        onCurrencyChange={handleCurrencyChange}
        lastUpdated={lastUpdated || currencyLastUpdated}
      />

      <BudgetSummary
        total={total}
        paidTotal={paidTotal}
        selectedCurrency={selectedCurrency}
      />

      <ExpenseActions onAddExpense={() => setIsAddingExpense(true)} />

      <div className="bg-white rounded-lg shadow overflow-hidden" data-lov-id="budget-card">
        {convertedExpenses.length > 0 && (
          <ExpenseTable
            expenses={convertedExpenses}
            selectedCurrency={selectedCurrency}
            onUpdatePaidAmount={handleUpdatePaidAmount}
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
