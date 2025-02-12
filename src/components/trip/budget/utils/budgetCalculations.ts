
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
  return expenses.reduce((acc, exp) => {
    if (!exp.cost) return acc;
    const convertedAmount = convertAmount(
      exp.cost,
      exp.currency || 'USD',
      selectedCurrency,
      exchangeRates
    );

    return {
      ...acc,
      [exp.category]: (acc[exp.category] || 0) + convertedAmount,
      total: acc.total + convertedAmount
    };
  }, {
    Transportation: 0,
    Activities: 0,
    Accommodations: 0,
    Other: 0,
    total: 0
  });
};

export const getExpensesByCategory = (expenses: Expense[], category: string) => {
  return expenses.filter(expense => expense.category.toLowerCase() === category.toLowerCase());
};

export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
