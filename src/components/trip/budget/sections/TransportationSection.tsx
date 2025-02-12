
import React from 'react';
import ExpenseSection from '../ExpenseSection';
import { getExpensesByCategory } from '../utils/budgetCalculations';
import { Expense } from '@/integrations/supabase/types/models';

interface TransportationSectionProps {
  expenses: Expense[];
  amount: number;
  currency: string;
  isExpanded: boolean;
  onToggle: () => void;
  onAddExpense?: () => void;
  editingItem: string | null;
  onEdit: (id: string) => void;
  onUpdateCost: (id: string, category: string, cost: number, currency: string) => void;
  onDelete: (id: string, category: string) => void;
}

const TransportationSection: React.FC<TransportationSectionProps> = ({
  expenses,
  amount,
  currency,
  isExpanded,
  onToggle,
  onAddExpense,
  editingItem,
  onEdit,
  onUpdateCost,
  onDelete
}) => {
  return (
    <ExpenseSection
      title="Transportation"
      amount={amount}
      currency={currency}
      isExpanded={isExpanded}
      onToggle={onToggle}
      onAddExpense={onAddExpense}
      expenses={getExpensesByCategory(expenses, 'Transportation')}
      editingItem={editingItem}
      onEdit={onEdit}
      onUpdateCost={(id, cost, curr) => onUpdateCost(id, 'Transportation', cost, curr)}
      onDelete={(id) => onDelete(id, 'Transportation')}
    />
  );
};

export default TransportationSection;
