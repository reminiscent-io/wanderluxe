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
  const { selectedCurrency, handleCurrencyChange, rates, lastUpdated } = useCurrencyState();
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const { data: expenses } = useExpenses(tripId);
  const { addExpense, updateExpense } = useBudgetMutations(tripId);

  // Convert expenses to selected currency
  const convertedExpenses = useMemo(() => {
    if (!expenses?.items) return [];

    return expenses.items.map(expense => ({
      ...expense,
      convertedCost: convertCurrency(
        expense.cost || 0,
        expense.currency || 'USD',
        selectedCurrency,
        rates
      )
    }));
  }, [expenses?.items, selectedCurrency, rates]);

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

  const handleUpdatePaidStatus = (id: string, isPaid: boolean, category: string) => {
    updateExpense.mutate({ 
      id, 
      data: { 
        is_paid: isPaid 
      } 
    });
  };

  // Calculate totals using converted values
  const total = convertedExpenses.reduce((sum, item) => sum + item.convertedCost, 0);
  const paidTotal = convertedExpenses.reduce((sum, item) => 
    sum + (item.is_paid ? item.convertedCost : 0), 0);

  return (
    <div className="space-y-6">
      <BudgetHeader
        selectedCurrency={selectedCurrency}
        onCurrencyChange={handleCurrencyChange}
        lastUpdated={lastUpdated}
      />

      <BudgetSummary
        total={total}
        paidTotal={paidTotal}
        selectedCurrency={selectedCurrency}
      />

      <ExpenseActions onAddExpense={() => setIsAddingExpense(true)} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div data-lov-id="budget-card"> {/* Added div to wrap the Card */}
          {convertedExpenses.length > 0 && (
            <ExpenseTable
              expenses={convertedExpenses}
              selectedCurrency={selectedCurrency}
              onUpdatePaidStatus={handleUpdatePaidStatus}
            />
          )}
        </div> {/* Closing div */}
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