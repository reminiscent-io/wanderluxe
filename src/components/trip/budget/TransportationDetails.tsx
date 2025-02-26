
import React from 'react';
import { Car, Plane, Train, Bus } from 'lucide-react';
import ExpenseDetails from './ExpenseDetails';

interface TransportType {
  id: string;
  trip_id: string;  // Added required field
  type: 'car' | 'plane' | 'train' | 'bus';
  description: string;
  cost: number | null;
  currency: string | null;
  is_paid: boolean;
}

interface TransportationDetailsProps {
  transportationExpenses: TransportType[];
  onUpdateCost: (id: string, cost: number, currency: string) => void;
  onDeleteTransport: (id: string) => void;
}

const TransportationDetails: React.FC<TransportationDetailsProps> = ({
  transportationExpenses,
  onUpdateCost,
  onDeleteTransport,
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'car':
        return <Car className="h-4 w-4 text-earth-500" />;
      case 'plane':
        return <Plane className="h-4 w-4 text-earth-500" />;
      case 'train':
        return <Train className="h-4 w-4 text-earth-500" />;
      case 'bus':
        return <Bus className="h-4 w-4 text-earth-500" />;
      default:
        return <Car className="h-4 w-4 text-earth-500" />;
    }
  };

  return (
    <div className="space-y-2">
      {transportationExpenses.map((expense) => (
        <div key={expense.id} className="flex items-center gap-2">
          {getIcon(expense.type)}
          <ExpenseDetails
            expense={{
              id: expense.id,
              trip_id: expense.trip_id,  // Add required trip_id
              category: expense.type,
              description: expense.description,
              cost: expense.cost,
              currency: expense.currency,
              is_paid: expense.is_paid,
              created_at: new Date().toISOString(), // Add required created_at
              transportation_id: expense.id, // Add appropriate transportation_id
              activity_id: null,
              accommodation_id: null,
              title: expense.description // Add optional title
            }}
            onEdit={() => {}}
            onSave={(cost, currency) => onUpdateCost(expense.id, cost, currency)}
            onDelete={() => onDeleteTransport(expense.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default TransportationDetails;
