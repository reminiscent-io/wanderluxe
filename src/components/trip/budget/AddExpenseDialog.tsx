import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  onSubmit: (category: string, title: string, amount: number, currency: string, isPaid: boolean) => void;
  defaultCategory?: string;
}

const DEFAULT_CATEGORIES = ['Accommodation', 'Transportation', 'Activities', 'Other'];

const AddExpenseDialog: React.FC<AddExpenseDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultCategory
}) => {
  const [category, setCategory] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (defaultCategory) {
      setCategory(defaultCategory.toLowerCase());
    }
  }, [defaultCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !title || !amount) return;
    
    onSubmit(category, title, Number(amount), currency, isPaid);
    setCategory('');
    setTitle('');
    setAmount('');
    setCurrency('USD');
    setIsPaid(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="w-full bg-white border-earth-200">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent 
                className="bg-white w-[400px] max-h-[300px] overflow-y-auto"
                position="popper"
                side="bottom"
                align="start"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat.toLowerCase()} className="hover:bg-earth-50 py-3">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Expense Name</Label>
            <Input
              id="title"
              placeholder="e.g., Private Transfer from Naples Airport"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <CurrencySelector
                value={currency}
                onValueChange={setCurrency}
                className="w-[120px] bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-earth-50 rounded-lg">
            <Label htmlFor="paid" className="text-base font-medium text-earth-600">
              Mark as paid
            </Label>
            <Switch
              id="paid"
              checked={isPaid}
              onCheckedChange={setIsPaid}
              className="data-[state=checked]:bg-earth-500"
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