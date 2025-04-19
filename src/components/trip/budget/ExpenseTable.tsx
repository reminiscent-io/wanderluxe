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
import { DayActivity, Transportation } from '@/types/trip';

interface ExpenseTableProps {
  expenses: ExpenseItem[];
  selectedCurrency: string;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({ expenses, selectedCurrency }) => {
  // Store the expense selected for editing
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [isTransportationDialogOpen, setIsTransportationDialogOpen] = useState(false);
  const [isAccommodationDialogOpen, setIsAccommodationDialogOpen] = useState(false);
  const [isRestaurantDialogOpen, setIsRestaurantDialogOpen] = useState(false);

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
    
    if (expense.activity_id) {
      setIsActivityDialogOpen(true);
    } else if (expense.transportation_id) {
      setIsTransportationDialogOpen(true);
    } else if (expense.accommodation_id) {
      setIsAccommodationDialogOpen(true);
    } else if (
      expense.category?.toLowerCase() === 'dining' ||
      expense.category?.toLowerCase() === 'restaurant'
    ) {
      setIsRestaurantDialogOpen(true);
    }
  };
  
  const handleDialogClose = () => {
    setIsActivityDialogOpen(false);
    setIsTransportationDialogOpen(false);
    setIsAccommodationDialogOpen(false);
    setIsRestaurantDialogOpen(false);
    setSelectedExpense(null);
  };

  // Render the corresponding dialog based on the expense type or category
  const renderDialog = () => {
    if (!selectedExpense) return null;

    // Create a generic dialog for fallback cases
    const GenericDialog = () => (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-4 rounded shadow-lg">
          <p>No edit dialog configured for this expense type.</p>
          <button 
            onClick={handleDialogClose} 
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    );

    // Return appropriate dialog components based on expense type
    if (selectedExpense.activity_id && isActivityDialogOpen) {
      return (
        <ActivityDialogs 
          isEditDialogOpen={true}
          setIsEditDialogOpen={setIsActivityDialogOpen}
          tripId={selectedExpense.trip_id}
          dayId={selectedExpense.date || ""}
          activityToEdit={{
            id: selectedExpense.activity_id,
            day_id: selectedExpense.date || "",
            trip_id: selectedExpense.trip_id,
            title: selectedExpense.description,
            description: "",
            cost: selectedExpense.cost || 0,
            currency: selectedExpense.currency || "USD",
            order_index: 0,
            created_at: selectedExpense.created_at,
            is_paid: !!selectedExpense.amount_paid
          }}
          onActivityUpdated={() => handleDialogClose()}
        />
      );
    } else if (selectedExpense.transportation_id && isTransportationDialogOpen) {
      return (
        <TransportationDialog
          tripId={selectedExpense.trip_id}
          open={isTransportationDialogOpen}
          onOpenChange={setIsTransportationDialogOpen}
          initialData={{
            id: selectedExpense.transportation_id,
            trip_id: selectedExpense.trip_id,
            type: "",
            provider: "",
            details: selectedExpense.description,
            confirmation_number: null,
            start_date: selectedExpense.date || "",
            start_time: null,
            end_date: null,
            end_time: null,
            departure_location: null,
            arrival_location: null,
            cost: selectedExpense.cost,
            currency: selectedExpense.currency,
            is_paid: !!selectedExpense.amount_paid,
            created_at: selectedExpense.created_at
          }}
          onSuccess={handleDialogClose}
        />
      );
    } else if (selectedExpense.accommodation_id && isAccommodationDialogOpen) {
      return (
        <AccommodationDialog
          tripId={selectedExpense.trip_id}
          open={isAccommodationDialogOpen}
          onOpenChange={setIsAccommodationDialogOpen}
          initialData={{
            stay_id: selectedExpense.accommodation_id,
            trip_id: selectedExpense.trip_id,
            title: selectedExpense.description,
            description: null,
            image_url: null,
            hotel: selectedExpense.description,
            hotel_details: null,
            hotel_url: null,
            hotel_checkin_date: selectedExpense.date || "",
            hotel_checkout_date: selectedExpense.date || "",
            checkin_time: "14:00:00",
            checkout_time: "11:00:00",
            cost: selectedExpense.cost,
            currency: selectedExpense.currency,
            expense_type: "accommodation",
            is_paid: !!selectedExpense.amount_paid,
            expense_date: selectedExpense.date,
            hotel_address: null,
            hotel_phone: null,
            hotel_place_id: null,
            hotel_website: null,
            order_index: 0,
            created_at: selectedExpense.created_at,
            final_accommodation_day: null
          }}
          onSuccess={handleDialogClose}
        />
      );
    } else if (
      (selectedExpense.category?.toLowerCase() === 'dining' || 
       selectedExpense.category?.toLowerCase() === 'restaurant') && 
      isRestaurantDialogOpen
    ) {
      return (
        <RestaurantReservationDialog
          isOpen={isRestaurantDialogOpen}
          onOpenChange={setIsRestaurantDialogOpen}
          onSubmit={() => handleDialogClose()}
          isSubmitting={false}
          editingReservation={{
            restaurant_name: selectedExpense.description,
            cost: selectedExpense.cost,
            currency: selectedExpense.currency,
            is_paid: !!selectedExpense.amount_paid,
            reservation_time: selectedExpense.date ? `${selectedExpense.date}T19:00:00` : null
          }}
          title="Edit Restaurant Reservation"
          tripId={selectedExpense.trip_id}
        />
      );
    } else {
      return <GenericDialog />;
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