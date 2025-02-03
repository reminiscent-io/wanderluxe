import React from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ExpenseCardProps {
  title: string;
  amount: number;
  currency: string;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const ExpenseCard: React.FC<ExpenseCardProps> = ({
  title,
  amount,
  currency,
  isExpanded,
  onToggle,
  children
}) => {
  return (
    <Card 
      className="p-6 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onToggle}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </div>
      <p className="text-2xl font-bold">{currency} {amount.toFixed(2)}</p>
      {isExpanded && (
        <div className="mt-4 border-t pt-4">
          {children}
        </div>
      )}
    </Card>
  );
};

export default ExpenseCard;