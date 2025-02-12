
import { Expense, ExchangeRate } from '@/integrations/supabase/types/models';

export const convertAmount = (
  amount: number, 
  fromCurrency: string, 
  selectedCurrency: string, 
  exchangeRates: ExchangeRate[]
) => {
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

export const calculateTotals = (
  expenses: Expense[], 
  selectedCurrency: string, 
  exchangeRates: ExchangeRate[]
) => {
  const totals = {
    Transportation: 0,
    Activities: 0,
    Accommodations: 0,
    Other: 0,
    total: 0
  };

  expenses.forEach(expense => {
    if (expense.cost && expense.currency) {
      const convertedAmount = convertAmount(
        expense.cost, 
        expense.currency, 
        selectedCurrency, 
        exchangeRates
      );

      totals[expense.category as keyof typeof totals] += convertedAmount;
      totals.total += convertedAmount;
    }
  });
  
  return totals;
};

export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
