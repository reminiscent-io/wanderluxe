
import React, { useState } from 'react';
import { useBudgetEvents } from './budget/hooks/useBudgetEvents';
import { calculateTotals, formatCurrency } from './budget/utils/budgetCalculations';
import TotalExpenseCard from './budget/TotalExpenseCard';
import BudgetHeader from './budget/BudgetHeader';
import AccommodationSection from './budget/sections/AccommodationSection';
import TransportationSection from './budget/sections/TransportationSection';
import ActivitiesSection from './budget/sections/ActivitiesSection';
import { useExpandedSections } from './budget/hooks/useExpandedSections';
import { useCurrencyState } from './budget/hooks/useCurrencyState';

interface BudgetViewProps {
  tripId: string;
}

const BudgetView: React.FC<BudgetViewProps> = ({ tripId }) => {
  const { events, exchangeRates, lastUpdated, handleDeleteExpense, handleUpdateCost } = useBudgetEvents(tripId);
  const { selectedCurrency, handleCurrencyChange } = useCurrencyState();
  const { expandedSections, toggleSection } = useExpandedSections();
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const totals = calculateTotals(events, selectedCurrency, exchangeRates);

  const handleAddExpense = (category: string) => {
    console.log('Add expense:', category);
    // Implement add expense functionality
  };

  return (
    <div className="space-y-6">
      <BudgetHeader
        selectedCurrency={selectedCurrency}
        onCurrencyChange={handleCurrencyChange}
        lastUpdated={lastUpdated}
      />

      <TotalExpenseCard
        total={totals.total}
        paid={0} // Implement paid/unpaid tracking if needed
        unpaid={totals.total}
        currency={selectedCurrency}
      />

      <div className="space-y-4">
        <TransportationSection
          expenses={events}
          amount={totals.transportation}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('transportation')}
          onToggle={() => toggleSection('transportation')}
          onAddExpense={() => handleAddExpense('transportation')}
          editingItem={editingItem}
          onEdit={setEditingItem}
          onUpdateCost={handleUpdateCost}
          onDelete={handleDeleteExpense}
        />

        <ActivitiesSection
          expenses={events}
          amount={totals.activities}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('activities')}
          onToggle={() => toggleSection('activities')}
          onAddExpense={() => handleAddExpense('activities')}
          editingItem={editingItem}
          onEdit={setEditingItem}
          onUpdateCost={handleUpdateCost}
          onDelete={handleDeleteExpense}
        />

        <AccommodationSection
          expenses={events}
          amount={totals.reservations}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('reservations')}
          onToggle={() => toggleSection('reservations')}
          onAddExpense={() => handleAddExpense('reservations')}
          editingItem={editingItem}
          onEdit={setEditingItem}
          onUpdateCost={handleUpdateCost}
          onDelete={handleDeleteExpense}
        />
      </div>
    </div>
  );
};

export default BudgetView;
