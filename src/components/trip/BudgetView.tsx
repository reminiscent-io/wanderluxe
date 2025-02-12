
import React from 'react';
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
  const [editingItem, setEditingItem] = React.useState<string | null>(null);

  const totals = calculateTotals(events, selectedCurrency, exchangeRates);

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
          amount={totals.Transportation}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('transportation')}
          onToggle={() => toggleSection('transportation')}
          editingItem={editingItem}
          onEdit={setEditingItem}
          onUpdateCost={handleUpdateCost}
          onDelete={handleDeleteExpense}
        />

        <ActivitiesSection
          expenses={events}
          amount={totals.Activities}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('activities')}
          onToggle={() => toggleSection('activities')}
          editingItem={editingItem}
          onEdit={setEditingItem}
          onUpdateCost={handleUpdateCost}
          onDelete={handleDeleteExpense}
        />

        <AccommodationSection
          expenses={events}
          amount={totals.Accommodations}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('accommodations')}
          onToggle={() => toggleSection('accommodations')}
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
