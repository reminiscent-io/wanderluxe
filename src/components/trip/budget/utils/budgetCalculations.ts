
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

// Map various expense types to a common ExpenseItem format
export const mapToExpenseItems = (
  activities: any[],
  accommodations: any[],
  transportation: any[],
  restaurants: any[],
  otherExpenses: any[]
): ExpenseItem[] => {
  const items: ExpenseItem[] = [
    ...activities.map(a => ({
      id: a.id,
      description: a.title,
      category: 'Activities',
      cost: a.cost,
      currency: a.currency || 'USD',
      isPaid: a.is_paid || false,
      date: null
    })),
    ...accommodations.map(a => ({
      id: a.stay_id,
      description: a.title,
      category: 'Accommodations',
      cost: a.cost,
      currency: a.currency || 'USD',
      isPaid: a.is_paid || false,
      date: a.hotel_checkin_date
    })),
    ...transportation.map(t => ({
      id: t.id,
      description: `${t.type} - ${t.provider || 'Unknown'}`,
      category: 'Transportation',
      cost: t.cost,
      currency: t.currency || 'USD',
      isPaid: false,
      date: t.start_date
    })),
    ...restaurants.map(r => ({
      id: r.id,
      description: r.restaurant_name,
      category: 'Dining',
      cost: r.cost,
      currency: r.currency || 'USD',
      isPaid: r.is_paid || false,
      date: null
    })),
    ...otherExpenses.map(e => ({
      id: e.id,
      description: e.description,
      category: 'Other',
      cost: e.cost,
      currency: e.currency || 'USD',
      isPaid: e.is_paid || false,
      date: e.date
    }))
  ];

  // Sort items by cost (highest to lowest), with null costs at the end
  return items.sort((a, b) => {
    if (a.cost === null && b.cost === null) return 0;
    if (a.cost === null) return 1;
    if (b.cost === null) return -1;
    return b.cost - a.cost;
  });
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
