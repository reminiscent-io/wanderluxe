import React from 'react';
import { useBudgetEvents } from './budget/hooks/useBudgetEvents';
import { Accommodation } from '@/types/trip';  // Changed from TimelineEvent

interface BudgetViewProps {
  tripId: string;
}

const BudgetView: React.FC<BudgetViewProps> = ({ tripId }) => {
  const { events, exchangeRates } = useBudgetEvents(tripId);

  const calculateTotalInUSD = (events: Accommodation[]) => {
    return events.reduce((total, event) => {
      if (event.expense_cost && event.currency) {
        const rate = exchangeRates[event.currency] || 1;
        return total + (event.expense_cost * rate);
      }
      return total;
    }, 0);
  };

  const totalInUSD = calculateTotalInUSD(events);

  return (
    <div>
      <h2 className="text-lg font-semibold">Budget Overview</h2>
      <p className="text-gray-600">Total Budget in USD: ${totalInUSD.toFixed(2)}</p>
      <ul className="mt-4">
        {events.map((event) => (
          <li key={event.stay_id} className="flex justify-between">
            <span>{event.title}</span>
            <span>
              {event.expense_cost} {event.currency}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BudgetView;
