import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseItem, formatCurrency } from './utils/budgetCalculations';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import dialogs using their correct paths.
import ActivityDialogs from '@/components/trip/day/activities/ActivityDialogs';
import TransportationDialog from '@/components/trip/transportation/TransportationDialog';
import AccommodationDialog from '@/components/trip/accommodation/AccommodationDialog';
import RestaurantReservationDialog from '@/components/trip/dining/RestaurantReservationDialog';
import { ActivityFormData } from '@/types/trip';

const initialActivity: ActivityFormData = {
  title: "",
  description: "",
  start_time: "",
  end_time: "",
  cost: "",
  currency: "USD",
};

// Helper: map ExpenseItem to an ActivityFormData object
const mapExpenseToActivity = (expense: ExpenseItem): ActivityFormData => ({
  title: expense.title || "",
  description: expense.description || "",
  start_time: "", // Update if your expense has time values.
  end_time: "",
  cost: expense.cost ? String(expense.cost) : "",
  currency: expense.currency || "USD",
});

interface ExpenseTableProps {
  expenses: ExpenseItem[];
  selectedCurrency: string;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({ expenses, selectedCurrency }) => {
  // --- State for non-activity expense editing ---
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  // State for transportation editing (if needed separately)
  const [selectedTransportation, setSelectedTransportation] = useState<ExpenseItem | null>(null);
  const [isTransportationDialogOpen, setIsTransportationDialogOpen] = useState(false);

  // --- State for activity editing (replicating DayCard) ---
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState<ActivityFormData>(initialActivity);
  const [activityEdit, setActivityEdit] = useState<ActivityFormData>(initialActivity);

  // Group expenses by category.
  const expensesByCategory = expenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = [];
    }
    acc[expense.category].push(expense);
    return acc;
  }, {} as Record<string, ExpenseItem[]>);

  // Calculate totals per category.
  const categoryTotals = Object.entries(expensesByCategory).reduce((acc, [category, items]) => {
    acc[category] = items.reduce((sum, item) => sum + (item.cost || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  // --- Row click handling ---
  const handleRowClick = (expense: ExpenseItem) => {
    // For activities, replicate DayCard behavior.
    if (expense.activity_id) {
      handleActivityEditClick(expense);
    } else if (expense.transportation_id) {
      setSelectedTransportation(expense);
      setIsTransportationDialogOpen(true);
    } else {
      // For accommodation or dining, set selectedExpense.
      setSelectedExpense(expense);
    }
  };

  // Activity editing: set the editing activity state.
  const handleActivityEditClick = (expense: ExpenseItem) => {
    if (expense.id) {
      setEditingActivity(expense.id);
      setActivityEdit({
        title: expense.title || "",
        description: expense.description || "",
        start_time: "", // If available, e.g. expense.start_time.slice(0, 5)
        end_time: "",   // Similarly for end_time
        cost: expense.cost ? String(expense.cost) : "",
        currency: expense.currency || "USD",
      });
    }
  };

  // Stub callbacks for activity actions.
  const handleAddActivity = (activity: ActivityFormData) => {
    console.log("Adding new activity:", activity);
    // Insert your add logic here.
    setIsAddingActivity(false);
  };

  const handleEditActivity = (id: string, updatedActivity: ActivityFormData) => {
    console.log("Editing activity", id, updatedActivity);
    // Insert your update logic here.
    setEditingActivity(null);
    setActivityEdit(initialActivity);
  };

  const handleDeleteActivity = (id: string) => {
    console.log("Deleting activity with id:", id);
    // Insert your deletion logic here.
    setEditingActivity(null);
    setActivityEdit(initialActivity);
  };

  // --- Dialog rendering ---
  const renderEditDialog = () => {
    // If an activity is being edited (similar to DayCard).
    if (editingActivity) {
      return (
        <ActivityDialogs
          isAddingActivity={isAddingActivity}
          setIsAddingActivity={setIsAddingActivity}
          editingActivity={editingActivity}
          setEditingActivity={setEditingActivity}
          newActivity={newActivity}
          setNewActivity={setNewActivity}
          activityEdit={activityEdit}
          setActivityEdit={setActivityEdit}
          onAddActivity={handleAddActivity}
          onEditActivity={handleEditActivity}
          onDeleteActivity={handleDeleteActivity}
          eventId={selectedExpense ? selectedExpense.id : ""}
        />
      );
    }
    // Transportation editing.
    if (isTransportationDialogOpen && selectedTransportation) {
      return (
        <TransportationDialog
          tripId={selectedTransportation.trip_id}
          open={isTransportationDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsTransportationDialogOpen(false);
              setSelectedTransportation(null);
            }
          }}
          initialData={selectedTransportation}
          onSuccess={() => {
            setIsTransportationDialogOpen(false);
            setSelectedTransportation(null);
          }}
        />
      );
    }
    // Accommodation editing.
    if (selectedExpense && selectedExpense.accommodation_id) {
      return (
        <AccommodationDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setSelectedExpense(null);
          }}
          expense={selectedExpense}
        />
      );
    }
    // Dining editing.
    if (
      selectedExpense &&
      (selectedExpense.category?.toLowerCase() === "dining" ||
        selectedExpense.category?.toLowerCase() === "restaurant")
    ) {
      return (
        <RestaurantReservationDialog
          isOpen={true}
          onOpenChange={(open) => {
            if (!open) setSelectedExpense(null);
          }}
          onSubmit={(data) => {
            console.log("Updated restaurant reservation:", data);
            // Insert your update logic here.
            setSelectedExpense(null);
          }}
          isSubmitting={false}
          editingReservation={selectedExpense}
          title="Edit Restaurant Reservation"
          tripId={selectedExpense.trip_id}
        />
      );
    }
    return null;
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
          {Object.entries(expensesByCategory).flatMap(([category, items]) => {
            const sortedItems = items.sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            return [
              ...sortedItems.map((expense) => (
                <TableRow
                  key={expense.id}
                  className="group hover:bg-sand-50 cursor-pointer"
                  onClick={() => handleRowClick(expense)}
                >
                  <TableCell>
                    {expense.date ? format(new Date(expense.date), "MMM d, yyyy") : "-"}
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
                              Original: {formatCurrency(expense.cost || 0, expense.currency || "USD")}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      formatCurrency(expense.cost || 0, expense.currency || "USD")
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {expense.amount_paid !== null && expense.amount_paid !== undefined
                      ? formatCurrency(expense.amount_paid, expense.currency || selectedCurrency)
                      : "-"}
                  </TableCell>
                </TableRow>
              )),
              <TableRow key={`${category}-total`} className="bg-sand-50 font-medium">
                <TableCell />
                <TableCell>{category} Total</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(categoryTotals[category], selectedCurrency)}
                </TableCell>
                <TableCell />
              </TableRow>,
            ];
          })}
        </TableBody>
      </Table>
      {renderEditDialog()}
    </>
  );
};

export default ExpenseTable;
