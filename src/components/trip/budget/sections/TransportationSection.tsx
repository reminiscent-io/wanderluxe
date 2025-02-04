import React from 'react';
import ExpenseSection from '../ExpenseSection';
import { getExpensesByType } from '../utils/budgetCalculations';

interface TransportationSectionProps {
  expenses: any[];
  amount: number;
  currency: string;
  isExpanded: boolean;
  onToggle: () => void;
  onAddExpense: () => void;
  editingItem: string | null;
  onEdit: (id: string) => void;
  onUpdateCost: (id: string, cost: number, currency: string) => void;
  onDelete: (id: string) => void;
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
      expenses={getExpensesByType(expenses, 'transportation')}
      editingItem={editingItem}
      onEdit={onEdit}
      onUpdateCost={onUpdateCost}
      onDelete={onDelete}
    />
  );
};

export default TransportationSection;