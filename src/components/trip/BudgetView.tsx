
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ExpenseTable from './budget/ExpenseTable';
import BudgetHeader from './budget/BudgetHeader';
import AddExpenseDialog from './budget/AddExpenseDialog';
import { useCurrencyState } from './budget/hooks/useCurrencyState';
import { useExpenses } from './budget/hooks/useExpenses';
import { useBudgetMutations } from './budget/hooks/useBudgetMutations';
import BudgetSummary from './budget/components/BudgetSummary';
import ExpenseActions from './budget/components/ExpenseActions';

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
  const { selectedCurrency, handleCurrencyChange } = useCurrencyState();
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const { data: expenses } = useExpenses(tripId);
  const { addExpense, updateExpense } = useBudgetMutations(tripId);

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

  const total = expenses?.items.reduce((sum, item) => sum + (item.cost || 0), 0) || 0;
  const paidTotal = expenses?.items.reduce((sum, item) => sum + (item.is_paid ? (item.cost || 0) : 0), 0) || 0;

  return (
    <div className="space-y-6">
      <BudgetHeader
        selectedCurrency={selectedCurrency}
        onCurrencyChange={handleCurrencyChange}
        lastUpdated={null}
      />

      <BudgetSummary
        total={total}
        paidTotal={paidTotal}
        selectedCurrency={selectedCurrency}
      />

      <ExpenseActions onAddExpense={() => setIsAddingExpense(true)} />

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
