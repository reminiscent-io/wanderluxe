import { Currency, CURRENCY_SYMBOLS } from '@/utils/currencyConstants';
import { ExpenseItem } from '@/types/trip';
import { Expense, ExchangeRate } from '@/integrations/supabase/types/models';

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

export const formatCurrency = (amount: number | null, currency: Currency | null): string => {
  if (amount === null || currency === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const getExpensesByCategory = (expenses: ExpenseItem[], category: string): ExpenseItem[] => {
  return expenses.filter(expense => expense.category === category);
};

export const calculateTotalAmount = (expenses: ExpenseItem[]): number => {
  return expenses.reduce((total, expense) => total + (expense.cost || 0), 0);
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
      const type = transport.type || '';
      const provider = transport.provider || '';
      const departure = transport.departure_location || '';
      const arrival = transport.arrival_location || '';
      // Build description in the format: "Flight | Delta JFK - LAX"
      const description = `${type} | ${provider} ${departure} - ${arrival}`.trim();
      items.push({
        id: transport.id,
        description,
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
  exchangeRates: Record<string, Record<string, number>>
): number => {
  if (!amount) return 0;
  if (fromCurrency === selectedCurrency) return amount;
  if (!exchangeRates[fromCurrency] || !exchangeRates['USD']) return amount;

  // Convert to USD first
  const toUsdRate = exchangeRates[fromCurrency]['USD'] || 1;

  // Then convert from USD to target currency
  const fromUsdRate = exchangeRates['USD'][selectedCurrency] || 1;

  return amount * toUsdRate * fromUsdRate;
};

// Format currency amount to string
export const formatCurrencyOld = (amount: number | null, currency: string): string => {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
