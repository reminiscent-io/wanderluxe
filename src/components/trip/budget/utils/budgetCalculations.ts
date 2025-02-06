interface ExchangeRate {
  id: string;
  currency_from: string;
  currency_to: string;
  rate: number;
  last_updated: string;
}

interface Currency {
  currency: string;
  currency_name: string;
  symbol: string;
}

interface Accommodation {
  stay_id: string;
  expense_cost: number | null;
  currency: string | null;
  expense_type: string | null;
  expense_paid: boolean;
}

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
  events: Accommodation[] | undefined, 
  selectedCurrency: string, 
  exchangeRates: ExchangeRate[]
) => {
  let accommodationTotal = 0;
  let transportationTotal = 0;
  let activitiesTotal = 0;
  let otherTotal = 0;
  let paidTotal = 0;
  let unpaidTotal = 0;

  events?.forEach(event => {
    if (event.expense_cost && event.currency) {
      const convertedAmount = convertAmount(
        Number(event.expense_cost), 
        event.currency, 
        selectedCurrency, 
        exchangeRates
      );

      switch (event.expense_type) {
        case 'accommodation':
          accommodationTotal += convertedAmount;
          break;
        case 'transportation':
          transportationTotal += convertedAmount;
          break;
        case 'activities':
          activitiesTotal += convertedAmount;
          break;
        case 'other':
          otherTotal += convertedAmount;
          break;
      }

      if (event.expense_paid) {
        paidTotal += convertedAmount;
      } else {
        unpaidTotal += convertedAmount;
      }
    }
  });

  const total = accommodationTotal + transportationTotal + activitiesTotal + otherTotal;
  
  return {
    accommodation: accommodationTotal,
    transportation: transportationTotal,
    activities: activitiesTotal,
    other: otherTotal,
    total,
    paid: paidTotal,
    unpaid: unpaidTotal
  };
};

export const getExpensesByType = (
  events: Accommodation[] | undefined, 
  type: string
): Accommodation[] => {
  return events?.filter(event => 
    event.expense_type === type && 
    event.expense_cost !== null && 
    event.currency !== null
  ) || [];
};

export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
