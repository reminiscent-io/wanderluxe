import React, { useState } from 'react';
import { useBudgetEvents } from './budget/hooks/useBudgetEvents';
import { useCurrencyState } from './budget/hooks/useCurrencyState';
import { useExpandedSections } from './budget/hooks/useExpandedSections';
import { calculateTotals } from './budget/utils/budgetCalculations';
import BudgetHeader from './budget/BudgetHeader';
import AccommodationSection from './budget/sections/AccommodationSection';
import TransportationSection from './budget/sections/TransportationSection';
import ActivitiesSection from './budget/sections/ActivitiesSection';
import TotalExpenseCard from './budget/TotalExpenseCard';
import AddExpenseDialog from './budget/AddExpenseDialog';

interface BudgetViewProps {
  tripId: string | undefined;
}

const BudgetView: React.FC<BudgetViewProps> = ({ tripId }) => {
  const { selectedCurrency, setSelectedCurrency } = useCurrencyState('USD');
  const { expandedSections, toggleSection } = useExpandedSections();
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const {
    events,
    exchangeRates,
    lastUpdated,
    handleDeleteExpense,
    handleUpdateCost,
    handleAddExpense
  } = useBudgetEvents(tripId);

  const handleAddExpenseClick = (category: string) => {
    setSelectedCategory(category);
    setIsAddExpenseOpen(true);
  };

  const totals = calculateTotals(events, selectedCurrency, exchangeRates);

  return (
    <div className="space-y-8">
      <BudgetHeader
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
        lastUpdated={lastUpdated}
      />

      <div className="flex flex-col space-y-4">
        <AccommodationSection
          expenses={events}
          amount={totals.accommodation}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('accommodation')}
          onToggle={() => toggleSection('accommodation')}
          onAddExpense={() => handleAddExpenseClick('accommodation')}
          editingItem={editingItem}
          onEdit={setEditingItem}
          onUpdateCost={handleUpdateCost}
          onDelete={handleDeleteExpense}
        />

        <TransportationSection
          expenses={events}
          amount={totals.transportation}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('transportation')}
          onToggle={() => toggleSection('transportation')}
          onAddExpense={() => handleAddExpenseClick('transportation')}
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
          onAddExpense={() => handleAddExpenseClick('activities')}
          editingItem={editingItem}
          onEdit={setEditingItem}
          onUpdateCost={handleUpdateCost}
          onDelete={handleDeleteExpense}
        />

        <TotalExpenseCard 
          total={totals.total} 
          paid={totals.paid}
          unpaid={totals.unpaid}
          currency={selectedCurrency} 
        />
      </div>

      <AddExpenseDialog 
        open={isAddExpenseOpen}
        onOpenChange={setIsAddExpenseOpen}
        onSubmit={handleAddExpense}
        defaultCategory={selectedCategory}
      />
    </div>
  );
};

export default BudgetView;