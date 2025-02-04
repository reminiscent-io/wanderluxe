import React, { useState } from 'react';
import { useBudgetEvents } from './budget/hooks/useBudgetEvents';
import { calculateTotals, getExpensesByType } from './budget/utils/budgetCalculations';
import BudgetHeader from './budget/BudgetHeader';
import ExpenseSection from './budget/ExpenseSection';
import TotalExpenseCard from './budget/TotalExpenseCard';
import AddExpenseDialog from './budget/AddExpenseDialog';

interface BudgetViewProps {
  tripId: string | undefined;
}

const BudgetView: React.FC<BudgetViewProps> = ({ tripId }) => {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

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
        <ExpenseSection
          title="Accommodation"
          amount={totals.accommodation}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('accommodation')}
          onToggle={() => toggleSection('accommodation')}
          onAddExpense={() => handleAddExpenseClick('accommodation')}
          expenses={getExpensesByType(events, 'accommodation')}
          editingItem={editingItem}
          onEdit={setEditingItem}
          onUpdateCost={handleUpdateCost}
          onDelete={handleDeleteExpense}
        />

        <ExpenseSection
          title="Transportation"
          amount={totals.transportation}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('transportation')}
          onToggle={() => toggleSection('transportation')}
          onAddExpense={() => handleAddExpenseClick('transportation')}
          expenses={getExpensesByType(events, 'transportation')}
          editingItem={editingItem}
          onEdit={setEditingItem}
          onUpdateCost={handleUpdateCost}
          onDelete={handleDeleteExpense}
        />

        <ExpenseSection
          title="Activities"
          amount={totals.activities}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('activities')}
          onToggle={() => toggleSection('activities')}
          onAddExpense={() => handleAddExpenseClick('activities')}
          expenses={getExpensesByType(events, 'activities')}
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