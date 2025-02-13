
import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ExpenseActionsProps {
  onAddExpense: () => void;
}

const ExpenseActions: React.FC<ExpenseActionsProps> = ({ onAddExpense }) => {
  return (
    <div className="flex justify-end">
      <Button
        onClick={onAddExpense}
        className="bg-earth-500 hover:bg-earth-600"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Other Expense
      </Button>
    </div>
  );
};

export default ExpenseActions;
