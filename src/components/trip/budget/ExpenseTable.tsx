import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExpenseItem, formatCurrency } from './utils/budgetCalculations';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";

interface ExpenseTableProps {
  expenses: ExpenseItem[];
  selectedCurrency: string;
  onUpdatePaidAmount: (id: string, amountPaid: number, category: string) => void;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  selectedCurrency,
  onUpdatePaidAmount,
}) => {
  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = [];
    }
    acc[expense.category].push(expense);
    return acc;
  }, {} as Record<string, ExpenseItem[]>);

  // Calculate category totals
  const categoryTotals = Object.entries(expensesByCategory).reduce((acc, [category, items]) => {
    acc[category] = items.reduce((sum, item) => sum + (item.cost || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  // Calculate category paid totals
  const categoryPaidTotals = Object.entries(expensesByCategory).reduce((acc, [category, items]) => {
    acc[category] = items.reduce((sum, item) => sum + (item.amount_paid || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  // State for tracking edited amounts
  const [editedAmounts, setEditedAmounts] = useState<Record<string, string>>({});

  const handleAmountChange = (id: string, value: string) => {
    setEditedAmounts((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveAmount = (expense: ExpenseItem) => {
    const amountStr = editedAmounts[expense.id] || '';
    const amount = parseFloat(amountStr);
    if (!isNaN(amount)) {
      onUpdatePaidAmount(expense.id, amount, expense.category);
      // Clear from edited state after saving
      setEditedAmounts((prev) => {
        const newState = { ...prev };
        delete newState[expense.id];
        return newState;
      });
    }
  };

  // Auto-save on blur
  const handleBlur = (expense: ExpenseItem) => {
    if (editedAmounts[expense.id] !== undefined) {
      handleSaveAmount(expense);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Amount Paid</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(expensesByCategory).map(([category, items]) => {
          // Wrap children in a div with data-lov-id if needed; React.Fragment only accepts key
          return (
            <div key={category} data-lov-id="budget-category-group">
              {items
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((expense) => (
                  <TableRow key={expense.id} className="group hover:bg-sand-50">
                    <TableCell>
                      {expense.date ? format(new Date(expense.date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell className="text-right">
                      {expense.convertedCost !== undefined ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                {formatCurrency(expense.convertedCost, selectedCurrency)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Original: {formatCurrency(expense.cost || 0, expense.currency || 'USD')}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        formatCurrency(expense.cost || 0, expense.currency || 'USD')
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={
                          editedAmounts[expense.id] !== undefined
                            ? editedAmounts[expense.id]
                            : expense.amount_paid || ''
                        }
                        onChange={(e) => handleAmountChange(expense.id, e.target.value)}
                        onBlur={() => handleBlur(expense)}
                        className="w-24 h-8 text-right"
                        placeholder="0.00"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              <TableRow className="bg-sand-50 font-medium">
                <TableCell />
                <TableCell>{category} Total</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(categoryTotals[category], selectedCurrency)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(categoryPaidTotals[category], selectedCurrency)}
                </TableCell>
              </TableRow>
            </div>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default ExpenseTable;
