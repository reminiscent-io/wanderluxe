import React from 'react';
import { Card } from '@/components/ui/card';

interface TotalExpenseCardProps {
  total: number;
  currency: string;
}

const TotalExpenseCard: React.FC<TotalExpenseCardProps> = ({ total, currency }) => {
  return (
    <Card className="p-6 bg-earth-50">
      <h3 className="text-sm font-medium text-earth-500">Total</h3>
      <p className="text-2xl font-bold text-earth-500">
        {currency} {total.toFixed(2)}
      </p>
    </Card>
  );
};

export default TotalExpenseCard;