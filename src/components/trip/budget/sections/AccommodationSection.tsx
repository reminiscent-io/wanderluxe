import React from 'react';
import ExpenseSection from '../ExpenseSection';
import { getExpensesByType } from '../utils/budgetCalculations';

interface AccommodationSectionProps {
  expenses: any[];
  amount: number;
  currency: string;
  isExpanded: boolean;
  onToggle: () => void;
  onAddExpense: () => void;
  editingItem: string | null;
  onEdit: (stay_id: string) => void;
  onUpdateCost: (stay_id: string, cost: number, currency: string) => void;
  onDelete: (stay_id: string) => void;
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
      expenses={getExpensesByType(expenses, 'accommodation')}
      editingItem={editingItem}
      onEdit={onEdit}
      onUpdateCost={onUpdateCost}
      onDelete={onDelete}
    />
  );
};

export default AccommodationSection;
