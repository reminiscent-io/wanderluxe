import React, { useState, useEffect } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ExpenseCard from './budget/ExpenseCard';
import CurrencySelector from './budget/CurrencySelector';
import ExpenseDetails from './budget/ExpenseDetails';
import TransportationDetails from './budget/TransportationDetails';

interface BudgetViewProps {
  tripId: string | undefined;
}

const BudgetView: React.FC<BudgetViewProps> = ({ tripId }) => {
  const { events } = useTimelineEvents(tripId);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  useEffect(() => {
    const fetchExchangeRates = async () => {
      const usedCurrencies = new Set<string>();
      events?.forEach(event => {
        if (event.accommodation_currency) usedCurrencies.add(event.accommodation_currency);
        if (event.transportation_currency) usedCurrencies.add(event.transportation_currency);
        event.activities?.forEach(activity => {
          if (activity.currency) usedCurrencies.add(activity.currency);
        });
      });

      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .in('currency_from', Array.from(usedCurrencies))
        .eq('currency_to', selectedCurrency);

      if (error) {
        console.error('Error fetching exchange rates:', error);
      } else if (data && data.length > 0) {
        setExchangeRates(data);
        setLastUpdated(data[0].last_updated);
      }
    };

    fetchExchangeRates();
  }, [events, selectedCurrency]);

  const convertAmount = (amount: number, fromCurrency: string) => {
    if (fromCurrency === selectedCurrency) return amount;
    const rate = exchangeRates.find(r => r.currency_from === fromCurrency)?.rate || 1;
    return amount * rate;
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleUpdateCost = async (eventId: string, field: string, value: number, currency: string) => {
    try {
      const { error } = await supabase
        .from('timeline_events')
        .update({ [`${field}_cost`]: value, [`${field}_currency`]: currency })
        .eq('id', eventId);

      if (error) throw error;
      toast.success('Cost updated successfully');
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating cost:', error);
      toast.error('Failed to update cost');
    }
  };

  const calculateTotals = () => {
    let accommodationTotal = 0;
    let transportationTotal = 0;
    let activitiesTotal = 0;

    events?.forEach(event => {
      if (event.accommodation_cost && event.accommodation_currency) {
        accommodationTotal += convertAmount(Number(event.accommodation_cost), event.accommodation_currency);
      }
      if (event.transportation_cost && event.transportation_currency) {
        transportationTotal += convertAmount(Number(event.transportation_cost), event.transportation_currency);
      }
      event.activities?.forEach(activity => {
        if (activity.cost && activity.currency) {
          activitiesTotal += convertAmount(Number(activity.cost), activity.currency);
        }
      });
    });

    return {
      accommodation: accommodationTotal,
      transportation: transportationTotal,
      activities: activitiesTotal,
      total: accommodationTotal + transportationTotal + activitiesTotal
    };
  };

  const totals = calculateTotals();

  const getTransportationExpenses = () => {
    const expenses: any[] = [];
    events?.forEach(event => {
      if (event.transportation_cost && event.transportation_currency) {
        // Add flight expenses
        if (event.title.toLowerCase().includes('flight')) {
          expenses.push({
            id: `${event.id}-flight`,
            type: 'plane',
            description: `Flight: ${event.date} - ${event.title}`,
            cost: event.transportation_cost,
            currency: event.transportation_currency
          });
        }
        // Add car service expenses
        else if (event.title.toLowerCase().includes('car')) {
          expenses.push({
            id: `${event.id}-car`,
            type: 'car',
            description: `Car Service: ${event.date} - ${event.title}`,
            cost: event.transportation_cost,
            currency: event.transportation_currency
          });
        }
        // Add other transportation expenses
        else {
          expenses.push({
            id: `${event.id}-transport`,
            type: 'car',
            description: `Transportation: ${event.date} - ${event.title}`,
            cost: event.transportation_cost,
            currency: event.transportation_currency
          });
        }
      }
    });
    return expenses;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-earth-500">Trip Budget</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Display in:</span>
              <CurrencySelector
                value={selectedCurrency}
                onValueChange={setSelectedCurrency}
                className="w-[100px]"
              />
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-sm text-gray-500">
            Exchange rates last updated: {format(new Date(lastUpdated), 'PPpp')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ExpenseCard
          title="Accommodation"
          amount={totals.accommodation}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('accommodation')}
          onToggle={() => toggleSection('accommodation')}
        >
          {events?.map(event => (
            event.accommodation_cost && (
              <ExpenseDetails
                key={`${event.id}-accommodation`}
                id={event.id}
                cost={event.accommodation_cost}
                currency={event.accommodation_currency}
                description={`${event.date} - ${event.title}`}
                isEditing={editingItem === `${event.id}-accommodation`}
                onEdit={() => setEditingItem(`${event.id}-accommodation`)}
                onSave={(cost, currency) => handleUpdateCost(event.id, 'accommodation', cost, currency)}
              />
            )
          ))}
        </ExpenseCard>

        <ExpenseCard
          title="Transportation"
          amount={totals.transportation}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('transportation')}
          onToggle={() => toggleSection('transportation')}
        >
          <TransportationDetails
            transportationExpenses={getTransportationExpenses()}
            onUpdateCost={(id, cost, currency) => {
              const eventId = id.split('-')[0];
              handleUpdateCost(eventId, 'transportation', cost, currency);
            }}
          />
        </ExpenseCard>

        <ExpenseCard
          title="Activities"
          amount={totals.activities}
          currency={selectedCurrency}
          isExpanded={expandedSections.includes('activities')}
          onToggle={() => toggleSection('activities')}
        >
          {events?.map(event => 
            event.activities?.map(activity => (
              <ExpenseDetails
                key={activity.id}
                id={activity.id}
                cost={activity.cost}
                currency={activity.currency}
                description={activity.text}
                isEditing={editingItem === activity.id}
                onEdit={() => setEditingItem(activity.id)}
                onSave={(cost, currency) => handleUpdateCost(activity.id, 'activity', cost, currency)}
              />
            ))
          )}
        </ExpenseCard>

        <Card className="p-6 bg-earth-50">
          <h3 className="text-sm font-medium text-earth-500">Total</h3>
          <p className="text-2xl font-bold text-earth-500">
            {selectedCurrency} {totals.total.toFixed(2)}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default BudgetView;
