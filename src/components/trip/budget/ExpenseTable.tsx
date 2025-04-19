import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExpenseItem, formatCurrency } from './utils/budgetCalculations';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Import the edit dialogs
import ActivityDialogs from '@/components/trip/day/activities/ActivityDialogs';
import TransportationDialog from '@/components/trip/transportation/TransportationDialog';
import RestaurantReservationDialog from '@/components/trip/dining/RestaurantReservationDialog';
import AccommodationDialog from '@/components/trip/accommodation/AccommodationDialog';

interface ExpenseTableProps {
  expenses: ExpenseItem[];
  selectedCurrency: string;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({ expenses, selectedCurrency }) => {
  // Store the expense selected for editing
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);

  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = [];
    }
    acc[expense.category].push(expense);
    return acc;
  }, {} as Record<string, ExpenseItem[]>);

  // Calculate category totals (summing based on cost)
  const categoryTotals = Object.entries(expensesByCategory).reduce((acc, [category, items]) => {
    acc[category] = items.reduce((sum, item) => sum + (item.cost || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const handleRowClick = (expense: ExpenseItem) => {
    console.log("Row clicked", expense);
    setSelectedExpense(expense);
  };

  // Render the corresponding dialog based on the expense type or category
  const renderDialog = () => {
    if (!selectedExpense) return null;

    if (selectedExpense.activity_id) {
      // For now, we'll just show a placeholder since ActivityDialogs requires more complex props
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <p>Activity editing is not implemented in this view.</p>
            <p>Activity ID: {selectedExpense.activity_id}</p>
            <button 
              onClick={() => setSelectedExpense(null)} 
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      );
    } else if (selectedExpense.transportation_id) {
      return (
        <TransportationDialog 
          open={true}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
        />
      );
    } else if (selectedExpense.accommodation_id) {
      return (
        <AccommodationDialog 
          open={true}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
        />
      );
    } else if (
      selectedExpense.category?.toLowerCase() === 'dining' ||
      selectedExpense.category?.toLowerCase() === 'restaurant'
    ) {
      return (
        <RestaurantReservationDialog 
          open={true}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
        />
      );
    } else {
      // Fallback: If no dialog matches, show a simple modal for debugging.
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <p>No edit dialog configured for this expense type.</p>
            <button 
              onClick={() => setSelectedExpense(null)} 
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-center">Amount Paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(expensesByCategory).map(([category, items]) => {
            // Sort items in ascending order by date
            const sortedItems = items.sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            return (
              <React.Fragment key={category}>
                {sortedItems.map(expense => (
                  <TableRow 
                    key={expense.id} 
                    className="group hover:bg-sand-50 cursor-pointer"
                    onClick={() => handleRowClick(expense)}
                  >
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
                    <TableCell className="text-center">
                      {expense.amount_paid !== null && expense.amount_paid !== undefined
                        ? formatCurrency(expense.amount_paid, expense.currency || selectedCurrency)
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-sand-50 font-medium">
                  <TableCell />
                  <TableCell>{category} Total</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(categoryTotals[category], selectedCurrency)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
      {renderDialog()}
    </>
  );
};

export default ExpenseTable;