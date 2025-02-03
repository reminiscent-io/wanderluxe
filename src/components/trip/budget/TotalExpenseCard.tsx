import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart2 } from 'lucide-react';

interface TotalExpenseCardProps {
  total: number;
  currency: string;
}

const TotalExpenseCard: React.FC<TotalExpenseCardProps> = ({ total, currency }) => {
  return (
    <Card className="bg-sand-50 shadow-md p-6">
      <div className="flex items-center gap-2">
        <BarChart2 className="h-5 w-5" />
        <span className="text-lg font-medium">Total Trip Budget</span>
        <span className="text-2xl font-bold text-earth-500 ml-auto">
          {currency} {total.toFixed(2)}
        </span>
      </div>
    </Card>
  );
};

export default TotalExpenseCard;