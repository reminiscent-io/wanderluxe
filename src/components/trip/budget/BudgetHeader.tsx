import React from 'react';
import { format } from 'date-fns';
import CurrencySelector from './CurrencySelector';

interface BudgetHeaderProps {
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  lastUpdated: string | null;
}

const BudgetHeader: React.FC<BudgetHeaderProps> = ({
  selectedCurrency,
  onCurrencyChange,
  lastUpdated
}) => {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-earth-500">Trip Budget</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Display in:</span>
          <CurrencySelector
            value={selectedCurrency}
            onValueChange={onCurrencyChange}
            className="w-[100px]"
          />
        </div>
      </div>
      {lastUpdated && (
        <p className="text-sm text-gray-500">
          Exchange rates last updated: {format(new Date(lastUpdated), 'PPpp')}
        </p>
      )}
    </div>
  );
};

export default BudgetHeader;