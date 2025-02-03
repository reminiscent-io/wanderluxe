import React from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface BudgetViewProps {
  tripId: string | undefined;
}

const BudgetView: React.FC<BudgetViewProps> = ({ tripId }) => {
  const { events } = useTimelineEvents(tripId);

  // Calculate totals from timeline events
  const calculateTotals = () => {
    let accommodationTotal = 0;
    let transportationTotal = 0;
    let activitiesTotal = 0;

    events?.forEach(event => {
      if (event.accommodation_cost) {
        accommodationTotal += Number(event.accommodation_cost);
      }
      if (event.transportation_cost) {
        transportationTotal += Number(event.transportation_cost);
      }
      event.activities?.forEach(activity => {
        if (activity.cost) {
          activitiesTotal += Number(activity.cost);
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-earth-500">Trip Budget</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500">Accommodation</h3>
          <p className="text-2xl font-bold">${totals.accommodation.toFixed(2)}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500">Transportation</h3>
          <p className="text-2xl font-bold">${totals.transportation.toFixed(2)}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500">Activities</h3>
          <p className="text-2xl font-bold">${totals.activities.toFixed(2)}</p>
        </Card>
        <Card className="p-6 bg-earth-50">
          <h3 className="text-sm font-medium text-earth-500">Total</h3>
          <p className="text-2xl font-bold text-earth-500">${totals.total.toFixed(2)}</p>
        </Card>
      </div>

      <div className="mt-8">
        {/* We'll implement the detailed expense list and add expense form in the next iteration */}
      </div>
    </div>
  );
};

export default BudgetView;