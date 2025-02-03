export const convertAmount = (amount: number, fromCurrency: string, selectedCurrency: string, exchangeRates: any[]) => {
  if (fromCurrency === selectedCurrency) return amount;
  const rate = exchangeRates.find(r => r.currency_from === fromCurrency)?.rate || 1;
  return amount * rate;
};

export const calculateTotals = (events: any[] | undefined, selectedCurrency: string, exchangeRates: any[]) => {
  let accommodationTotal = 0;
  let transportationTotal = 0;
  let activitiesTotal = 0;
  let otherTotal = 0;

  events?.forEach(event => {
    if (event.expense_cost && event.expense_currency) {
      const convertedAmount = convertAmount(Number(event.expense_cost), event.expense_currency, selectedCurrency, exchangeRates);
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
    }

    if (event.activities && event.activities.length > 0) {
      event.activities.forEach((activity: any) => {
        if (activity.cost && activity.currency) {
          const convertedActivityAmount = convertAmount(Number(activity.cost), activity.currency, selectedCurrency, exchangeRates);
          activitiesTotal += convertedActivityAmount;
        }
      });
    }
  });

  const total = accommodationTotal + transportationTotal + activitiesTotal + otherTotal;
  
  return {
    accommodation: accommodationTotal,
    transportation: transportationTotal,
    activities: activitiesTotal,
    other: otherTotal,
    total: total
  };
};

export const getExpensesByType = (events: any[] | undefined, type: string) => {
  return events?.filter(event => 
    event.expense_type === type && event.expense_cost && event.expense_currency
  ) || [];
};