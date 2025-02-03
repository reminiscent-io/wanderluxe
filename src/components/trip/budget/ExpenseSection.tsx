import React from 'react';
import ExpenseCard from './ExpenseCard';
import ExpenseDetails from './ExpenseDetails';

interface ExpenseSectionProps {
  title: string;
  amount: number;
  currency: string;
  isExpanded: boolean;
  onToggle: () => void;
  onAddExpense: () => void;
  expenses: any[];
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
      {expenses.map(event => (
        <ExpenseDetails
          key={event.id}
          id={event.id}
          cost={event.expense_cost}
          currency={event.expense_currency}
          description={`${event.expense_date || event.date} - ${event.title}`}
          isEditing={editingItem === event.id}
          onEdit={() => onEdit(event.id)}
          onSave={(cost, currency) => onUpdateCost(event.id, cost, currency)}
          onDelete={() => onDelete(event.id)}
        />
      ))}
    </ExpenseCard>
  );
};

export default ExpenseSection;