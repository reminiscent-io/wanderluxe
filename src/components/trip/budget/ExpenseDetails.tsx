
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from './utils/budgetCalculations';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Expense } from '@/integrations/supabase/types/models';

interface ExpenseDetailsProps {
  expense: Expense;
}

const ExpenseDetails: React.FC<ExpenseDetailsProps> = ({ expense }) => {
  const togglePaid = async () => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ is_paid: !expense.is_paid })
        .eq('id', expense.id);

      if (error) throw error;
      toast.success('Payment status updated');
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <h3 className="font-medium text-sm text-muted-foreground">Description</h3>
          <p>{expense.description}</p>
        </div>
        
        <div>
          <h3 className="font-medium text-sm text-muted-foreground">Category</h3>
          <p>{expense.category}</p>
        </div>
        
        <div>
          <h3 className="font-medium text-sm text-muted-foreground">Amount</h3>
          <p>{expense.cost && expense.currency ? formatCurrency(expense.cost, expense.currency) : 'TBD'}</p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="paid-status"
            checked={!!expense.is_paid}
            onCheckedChange={togglePaid}
          />
          <Label htmlFor="paid-status">Marked as paid</Label>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseDetails;
