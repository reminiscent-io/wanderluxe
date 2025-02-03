import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CurrencySelector from './CurrencySelector';

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (category: string, amount: number, currency: string) => void;
}

const DEFAULT_CATEGORIES = ['Accommodation', 'Transportation', 'Activities'];

const AddExpenseDialog: React.FC<AddExpenseDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const [category, setCategory] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustomCategory ? newCategory : category;
    if (!finalCategory || !amount) return;
    
    onSubmit(finalCategory, Number(amount), currency);
    setCategory('');
    setNewCategory('');
    setAmount('');
    setCurrency('USD');
    setIsCustomCategory(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isCustomCategory ? (
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full bg-white border-earth-200">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {DEFAULT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="hover:bg-earth-50">
                    {cat}
                  </SelectItem>
                ))}
                <SelectItem value="custom" className="hover:bg-earth-50">
                  + Add Custom Category
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Enter custom category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="bg-white"
            />
          )}

          {category === 'custom' && !isCustomCategory && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCustomCategory(true)}
              className="w-full"
            >
              Add Custom Category
            </Button>
          )}

          <div className="flex gap-4">
            <Input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-white"
            />
            <CurrencySelector
              value={currency}
              onValueChange={setCurrency}
              className="w-[120px] bg-white"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-earth-500"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-earth-500 text-white hover:bg-earth-600"
            >
              Add Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseDialog;