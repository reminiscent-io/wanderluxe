import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import CurrencySelector from './CurrencySelector';

// Form schema
const formSchema = z.object({
  description: z.string().min(1, "Description is required"),
  cost: z.number().min(0, "Cost must be a positive number"),
  date: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  isPaid: z.boolean().default(false),
  amountPaid: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { 
    description: string; 
    cost: number; 
    date?: string; 
    currency: string;
    isPaid: boolean;
    amountPaid?: number;
  }) => Promise<void>;
  defaultCurrency: string;
}

const AddExpenseDialog: React.FC<AddExpenseDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultCurrency
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      cost: "",
      date: new Date().toISOString().split('T')[0],
      currency: defaultCurrency,
      isPaid: false,
      amountPaid: 0
    },
  });

  const handleSubmit = async (data: FormValues) => {
    await onSubmit({
      description: data.description,
      cost: Number(data.cost),
      date: data.date,
      currency: data.currency,
      isPaid: data.isPaid,
      amountPaid: data.amountPaid,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Other Expense</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter expense description"
                      className="bg-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Cost</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0" 
                        step="0.01"
                        placeholder="0.00"
                        className="bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem className="w-[120px]">
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <CurrencySelector
                        value={field.value}
                        onValueChange={field.onChange}
                        className="bg-white"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="date"
                      className="bg-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amountPaid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="bg-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


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
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseDialog;