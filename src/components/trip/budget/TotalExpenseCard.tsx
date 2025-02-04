import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart2, CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrency } from './utils/budgetCalculations';

interface TotalExpenseCardProps {
  total: number;
  paid: number;
  unpaid: number;
  currency: string;
}

const TotalExpenseCard: React.FC<TotalExpenseCardProps> = ({ 
  total, 
  paid, 
  unpaid, 
  currency 
}) => {
  return (
    <Card className="bg-sand-50 shadow-md p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-earth-500" />
          <span className="text-lg font-medium">Total Trip Budget</span>
          <span className="text-2xl font-bold text-earth-500 ml-auto">
            {formatCurrency(total, currency)}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-earth-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm">Paid</span>
            <span className="ml-auto font-medium text-green-600">
              {formatCurrency(paid, currency)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm">Unpaid</span>
            <span className="ml-auto font-medium text-red-600">
              {formatCurrency(unpaid, currency)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TotalExpenseCard;