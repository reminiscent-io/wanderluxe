import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Hotel, BarChart2, Car, Ticket, Plus } from 'lucide-react';

interface ExpenseCardProps {
  title: string;
  amount: number;
  currency: string;
  isExpanded: boolean;
  onToggle: () => void;
  onAddExpense: () => void;
  children?: React.ReactNode;
}

const ExpenseCard: React.FC<ExpenseCardProps> = ({
  title,
  amount,
  currency,
  isExpanded,
  onToggle,
  onAddExpense,
  children
}) => {
  const getIcon = () => {
    switch (title.toLowerCase()) {
      case 'accommodation':
        return <Hotel className="h-5 w-5" />;
      case 'transportation':
        return <Car className="h-5 w-5" />;
      case 'activities':
        return <Ticket className="h-5 w-5" />;
      default:
        return <BarChart2 className="h-5 w-5" />;
    }
  };

  return (
    <Card className="bg-sand-50 shadow-md">
      <Button
        onClick={onToggle}
        variant="ghost"
        className="w-full justify-between p-6 hover:bg-sand-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-lg font-medium">{title}</span>
          <span className="text-sm text-gray-500">
            {currency} {amount.toFixed(2)}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5" />
        ) : (
          <ChevronRight className="h-5 w-5" />
        )}
      </Button>

      {isExpanded && (
        <div className="p-6 pt-0 space-y-4">
          {children}
          <Button 
            onClick={onAddExpense}
            variant="outline" 
            className="w-full mt-4 text-earth-600 border-earth-200 hover:bg-earth-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add {title} Expense
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ExpenseCard;