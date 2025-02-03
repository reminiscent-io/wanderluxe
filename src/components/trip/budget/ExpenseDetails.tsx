import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CurrencySelector from './CurrencySelector';
import { Pencil, Trash2 } from 'lucide-react';
import { format, parse } from 'date-fns';

interface ExpenseDetailsProps {
  id: string;
  cost: number;
  currency: string;
  description: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (cost: number, currency: string) => void;
  onDelete: () => void;
}

const ExpenseDetails: React.FC<ExpenseDetailsProps> = ({
  id,
  cost,
  currency,
  description,
  isEditing,
  onEdit,
  onSave,
  onDelete
}) => {
  const [editCost, setEditCost] = React.useState(cost.toString());
  const [editCurrency, setEditCurrency] = React.useState(currency);

  const handleSave = () => {
    onSave(Number(editCost), editCurrency);
  };

  const formatDescription = (desc: string) => {
    // Split the description to separate date and title
    const [dateStr, ...titleParts] = desc.split(' - ');
    
    try {
      // Parse the date string (expected format: YYYY-MM-DD)
      const date = parse(dateStr, 'yyyy-MM-dd', new Date());
      // Format the date in the desired format
      const formattedDate = format(date, 'MMMM d, yyyy');
      return `${formattedDate} - ${titleParts.join(' - ')}`;
    } catch (error) {
      // If date parsing fails, return the original description
      return desc;
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Input
          type="number"
          value={editCost}
          onChange={(e) => setEditCost(e.target.value)}
          className="w-32"
        />
        <CurrencySelector
          value={editCurrency}
          onValueChange={setEditCurrency}
          className="w-24"
        />
        <Button onClick={handleSave} size="sm">Save</Button>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center text-sm text-gray-600 p-2 hover:bg-gray-50 rounded-md">
      <div>
        <span>{formatDescription(description)}</span>
        <span className="ml-2 text-earth-500">
          {cost} {currency}
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4 text-earth-500" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ExpenseDetails;