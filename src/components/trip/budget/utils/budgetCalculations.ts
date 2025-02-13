
import { Expense, ExchangeRate } from '@/integrations/supabase/types/models';

export interface ExpenseItem {
  id: string;
  description: string;
  category: string;
  cost: number | null;
  currency: string;
  is_paid: boolean;
  date?: string | null;
}

// Export the getExpensesByCategory function that was missing
export const getExpensesByCategory = (expenses: Expense[], category: string): Expense[] => {
  return expenses.filter(expense => expense.category === category);
};

// Convert amount between currencies using exchange rates
export const convertAmount = (
  amount: number | null, 
  fromCurrency: string, 
  selectedCurrency: string, 
  exchangeRates: ExchangeRate[]
): number => {
  if (!amount) return 0;
  if (fromCurrency === selectedCurrency) return amount;
  
  const toUsdRate = exchangeRates.find(r => 
    r.currency_from === fromCurrency && 
    r.currency_to === 'USD'
  )?.rate || 1;
  
  const fromUsdRate = exchangeRates.find(r => 
    r.currency_from === 'USD' && 
    r.currency_to === selectedCurrency
  )?.rate || 1;

  return amount * toUsdRate * fromUsdRate;
};

// Format currency amount to string
export const formatCurrency = (amount: number | null, currency: string): string => {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
