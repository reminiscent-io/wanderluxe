import React from 'react';
import { Car, Plane, Train, Bus } from 'lucide-react';
import ExpenseDetails from './ExpenseDetails';

interface TransportType {
  id: string;
  type: 'car' | 'plane' | 'train' | 'bus';
  description: string;
  cost: number | null;
  currency: string | null;
}

interface TransportationDetailsProps {
  transportationExpenses: TransportType[];
  onUpdateCost: (id: string, cost: number, currency: string) => void;
}

const TransportationDetails: React.FC<TransportationDetailsProps> = ({
  transportationExpenses,
  onUpdateCost,
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
            id={expense.id}
            cost={expense.cost}
            currency={expense.currency}
            description={expense.description}
            isEditing={false}
            onEdit={() => {}}
            onSave={(cost, currency) => onUpdateCost(expense.id, cost, currency)}
          />
        </div>
      ))}
    </div>
  );
};

export default TransportationDetails;