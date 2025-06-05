
import React from 'react';
import { formatCurrency } from '../utils/budgetCalculations';

interface BudgetSummaryProps {
  total: number;
  selectedCurrency: string;
}

const BudgetSummary: React.FC<BudgetSummaryProps> = ({ total, selectedCurrency }) => {
  return (
    <div className="flex justify-center items-center bg-sand-50 p-4 rounded-lg shadow">
      <div className="space-y-1 text-center">
        <p className="text-sm text-gray-500">Total Budget</p>
        <p className="text-2xl font-bold text-earth-600">
          {formatCurrency(total, selectedCurrency)}
        </p>
      </div>
    </div>
  );
};

export default BudgetSummary;
