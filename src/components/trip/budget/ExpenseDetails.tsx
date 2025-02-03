import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2 } from 'lucide-react';
import CurrencySelector from './CurrencySelector';

interface ExpenseDetailsProps {
  id: string;
  cost: number | null;
  currency: string | null;
  description: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (cost: number, currency: string) => void;
}

const ExpenseDetails: React.FC<ExpenseDetailsProps> = ({
  id,
  cost,
  currency,
  description,
  isEditing,
  onEdit,
  onSave,
}) => {
  const [editedCost, setEditedCost] = React.useState(cost?.toString() || '');
  const [editedCurrency, setEditedCurrency] = React.useState(currency || 'USD');

  const handleSave = () => {
    onSave(Number(editedCost), editedCurrency);
  };

  return (
    <div className="pl-4 py-2 flex justify-between items-center">
      <span>{description}</span>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={editedCost}
            onChange={(e) => setEditedCost(e.target.value)}
            className="w-24"
          />
          <CurrencySelector
            value={editedCurrency}
            onValueChange={setEditedCurrency}
            className="w-24"
          />
          <Button onClick={handleSave}>Save</Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span>{cost} {currency}</span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ExpenseDetails;