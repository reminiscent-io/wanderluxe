import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExpenseItem, formatCurrency } from './utils/budgetCalculations';
import { format } from 'date-fns';
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ExpenseTableProps {
  expenses: ExpenseItem[];
  selectedCurrency: string;
  onUpdatePaidStatus: (id: string, isPaid: boolean, category: string) => void;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  selectedCurrency,
  onUpdatePaidStatus
}) => {
  // Sort all expenses in ascending order by date
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-center">Paid</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedExpenses.map((expense) => (
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
                      <p>Original: {formatCurrency(expense.cost || 0, expense.currency || 'USD')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                formatCurrency(expense.cost || 0, expense.currency || 'USD')
              )}
            </TableCell>
            <TableCell className="text-center">
              <Switch
                checked={expense.is_paid}
                onCheckedChange={(checked) =>
                  onUpdatePaidStatus(expense.id, checked, expense.category)
                }
                className="data-[state=checked]:bg-green-500"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ExpenseTable;
