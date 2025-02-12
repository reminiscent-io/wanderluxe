
import React from 'react';
import ExpenseSection from '../ExpenseSection';
import { getExpensesByCategory } from '../utils/budgetCalculations';
import { Expense } from '@/integrations/supabase/types/models';

interface AccommodationSectionProps {
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

const AccommodationSection: React.FC<AccommodationSectionProps> = ({
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
      title="Accommodation"
      amount={amount}
      currency={currency}
      isExpanded={isExpanded}
      onToggle={onToggle}
      onAddExpense={onAddExpense}
      expenses={getExpensesByCategory(expenses, 'Accommodations')}
      editingItem={editingItem}
      onEdit={onEdit}
      onUpdateCost={(id, cost, curr) => onUpdateCost(id, 'Accommodations', cost, curr)}
      onDelete={(id) => onDelete(id, 'Accommodations')}
    />
  );
};

export default AccommodationSection;
