
import { Expense } from '@/types/trip';
import { ExchangeRate } from '@/integrations/supabase/types';

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
  events: Expense[] | undefined, 
  selectedCurrency: string, 
  exchangeRates: ExchangeRate[]
) => {
  let reservationsTotal = 0;
  let transportationTotal = 0;
  let activitiesTotal = 0;
  let total = 0;

  events?.forEach(event => {
    if (event.cost) {
      const convertedAmount = convertAmount(
        Number(event.cost), 
        event.currency, 
        selectedCurrency, 
        exchangeRates
      );

      switch (event.category) {
        case 'reservations':
          reservationsTotal += convertedAmount;
          break;
        case 'transportation':
          transportationTotal += convertedAmount;
          break;
        case 'activities':
          activitiesTotal += convertedAmount;
          break;
      }

      total += convertedAmount;
    }
  });
  
  return {
    reservations: reservationsTotal,
    transportation: transportationTotal,
    activities: activitiesTotal,
    total
  };
};

export const getExpensesByCategory = (
  events: Expense[] | undefined, 
  category: string
): Expense[] => {
  return events?.filter(event => event.category === category) || [];
};

export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
