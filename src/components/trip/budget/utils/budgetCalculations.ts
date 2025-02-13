
import { Expense, ExchangeRate } from '@/integrations/supabase/types/models';

export interface ExpenseItem {
  id: string;
  description: string;
  category: string;
  cost: number | null;
  currency: string;
  isPaid: boolean;
  date?: string | null;
}

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

// Calculate totals for all expense categories
export const calculateTotals = (
  expenses: ExpenseItem[], 
  selectedCurrency: string, 
  exchangeRates: ExchangeRate[]
) => {
  return expenses.reduce((acc, exp) => {
    if (!exp.cost) return acc;
    const convertedAmount = convertAmount(
      exp.cost,
      exp.currency,
      selectedCurrency,
      exchangeRates
    );

    return {
      ...acc,
      [exp.category]: (acc[exp.category] || 0) + convertedAmount,
      total: (acc.total || 0) + convertedAmount
    };
  }, {
    Transportation: 0,
    Activities: 0,
    Accommodations: 0,
    Other: 0,
    total: 0
  } as Record<string, number>);
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
