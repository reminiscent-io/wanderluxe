/*
import React from 'react';
import ExpenseCard from './ExpenseCard';
import ExpenseDetails from './ExpenseDetails';
import { Expense } from '@/integrations/supabase/types/models';

interface ExpenseSectionProps {
  title: string;
  amount: number;
  currency: string;
  isExpanded: boolean;
  onToggle: () => void;
  onAddExpense?: () => void;
  expenses: Expense[];
  editingItem: string | null;
  onEdit: (id: string) => void;
  onUpdateCost: (id: string, cost: number, currency: string) => void;
  onDelete: (id: string) => void;
}

const ExpenseSection: React.FC<ExpenseSectionProps> = ({
  title,
  amount,
  currency,
  isExpanded,
  onToggle,
  onAddExpense,
  expenses,
  editingItem,
  onEdit,
  onUpdateCost,
  onDelete
}) => {
  return (
    <ExpenseCard
      title={title}
      amount={amount}
      currency={currency}
      isExpanded={isExpanded}
      onToggle={onToggle}
      onAddExpense={onAddExpense}
    >
      {expenses.map(expense => (
        <ExpenseDetails
          key={expense.id}
          expense={expense}
        />
      ))}
    </ExpenseCard>
  );
};

export default ExpenseSection;
*/