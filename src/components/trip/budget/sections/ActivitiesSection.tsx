
import React from 'react';
import ExpenseSection from '../ExpenseSection';
import { getExpensesByCategory } from '../utils/budgetCalculations';

interface ActivitiesSectionProps {
  expenses: any[];
  amount: number;
  currency: string;
  isExpanded: boolean;
  onToggle: () => void;
  onAddExpense: () => void;
  editingItem: string | null;
  onEdit: (id: string) => void;
  onUpdateCost: (id: string, category: string, cost: number, currency: string) => void;
  onDelete: (id: string, category: string) => void;
}

const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({
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
      title="Activities"
      amount={amount}
      currency={currency}
      isExpanded={isExpanded}
      onToggle={onToggle}
      onAddExpense={onAddExpense}
      expenses={getExpensesByCategory(expenses, 'activities')}
      editingItem={editingItem}
      onEdit={onEdit}
      onUpdateCost={(id, cost, curr) => onUpdateCost(id, 'activities', cost, curr)}
      onDelete={(id) => onDelete(id, 'activities')}
    />
  );
};

export default ActivitiesSection;
