
import React from 'react';

// Simple currency formatter that accepts string currency codes
const formatCurrency = (amount: number | null, currency: string): string => {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

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
