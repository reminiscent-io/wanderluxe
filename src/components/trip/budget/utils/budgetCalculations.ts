import { format } from 'date-fns';
import { CURRENCY_SYMBOLS } from './currencyConverter';

export interface ExpenseItem {
  id: string;
  description: string;
  cost: number;
  convertedCost?: number;
  currency: string;
  date?: string;
  category?: string;
  is_paid: boolean;
}

export function formatCurrencyWithSymbol(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency;

  if (currency === 'JPY') {
    return `${symbol}${Math.round(amount)}`;
  }

  if (symbol === currency) {
    return `${amount.toFixed(2)} ${currency}`;
  } else {
    return `${symbol}${amount.toFixed(2)}`;
  }
}

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

// Export the getExpensesByCategory function
export const getExpensesByCategory = (expenses: Expense[], category: string): Expense[] => {
  return expenses.filter(expense => expense.category === category);
};

// Map different expense types to a unified ExpenseItem format
export const mapToExpenseItems = (
  activities: any[],
  accommodations: any[],
  transportation: any[],
  restaurants: any[],
  otherExpenses: any[]
): ExpenseItem[] => {
  const items: ExpenseItem[] = [];

  // Map activities
  activities.forEach(activity => {
    if (activity.cost) {
      items.push({
        id: activity.id,
        description: activity.title,
        category: 'Activities',
        cost: activity.cost,
        currency: activity.currency || 'USD',
        is_paid: activity.is_paid || false,
        date: activity.created_at
      });
    }
  });

  // Map accommodations
  accommodations.forEach(accommodation => {
    if (accommodation.cost) {
      items.push({
        id: accommodation.stay_id,
        description: accommodation.hotel || 'Accommodation',
        category: 'Accommodations',
        cost: accommodation.cost,
        currency: accommodation.currency || 'USD',
        is_paid: accommodation.is_paid || false,
        date: accommodation.hotel_checkin_date
      });
    }
  });

  // Map transportation
  transportation.forEach(transport => {
    if (transport.cost) {
      items.push({
        id: transport.id,
        description: `${transport.type} - ${transport.provider || ''}`,
        category: 'Transportation',
        cost: transport.cost,
        currency: transport.currency || 'USD',
        is_paid: transport.is_paid || false,
        date: transport.start_date
      });
    }
  });

  // Map restaurant reservations
  restaurants.forEach(reservation => {
    if (reservation.cost) {
      items.push({
        id: reservation.id,
        description: reservation.restaurant_name,
        category: 'Dining',
        cost: reservation.cost,
        currency: reservation.currency || 'USD',
        is_paid: reservation.is_paid || false,
        date: reservation.created_at
      });
    }
  });

  // Map other expenses
  otherExpenses.forEach(expense => {
    if (expense.cost) {
      items.push({
        id: expense.id,
        description: expense.description,
        category: 'Other',
        cost: expense.cost,
        currency: expense.currency || 'USD',
        is_paid: expense.is_paid || false,
        date: expense.date || expense.created_at
      });
    }
  });

  return items;
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Keeping old format for backward compatibility
export const formatCurrencyOld = (amount: number | null, currency: string): string => {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};