export const convertAmount = (amount: number, fromCurrency: string, selectedCurrency: string, exchangeRates: any[]) => {
  if (fromCurrency === selectedCurrency) return amount;
  
  // First convert to USD (our base currency)
  const toUsdRate = exchangeRates.find(r => 
    r.currency_from === fromCurrency && r.currency_to === 'USD'
  )?.rate || 1;
  
  // Then convert from USD to target currency
  const fromUsdRate = exchangeRates.find(r => 
    r.currency_from === 'USD' && r.currency_to === selectedCurrency
  )?.rate || 1;

  return amount * toUsdRate * fromUsdRate;
};

export const calculateTotals = (events: any[] | undefined, selectedCurrency: string, exchangeRates: any[]) => {
  let accommodationTotal = 0;
  let transportationTotal = 0;
  let activitiesTotal = 0;
  let otherTotal = 0;
  let paidTotal = 0;
  let unpaidTotal = 0;

  events?.forEach(event => {
    if (event.expense_cost && event.expense_currency) {
      const convertedAmount = convertAmount(
        Number(event.expense_cost), 
        event.expense_currency, 
        selectedCurrency, 
        exchangeRates
      );

      // Add to category totals
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

      // Add to paid/unpaid totals
      if (event.expense_paid) {
        paidTotal += convertedAmount;
      } else {
        unpaidTotal += convertedAmount;
      }
    }

    // Include activity costs
    if (event.activities && event.activities.length > 0) {
      event.activities.forEach((activity: any) => {
        if (activity.cost && activity.currency) {
          const convertedActivityAmount = convertAmount(
            Number(activity.cost), 
            activity.currency, 
            selectedCurrency, 
            exchangeRates
          );
          activitiesTotal += convertedActivityAmount;
          // Assume activities are unpaid by default
          unpaidTotal += convertedActivityAmount;
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
    total,
    paid: paidTotal,
    unpaid: unpaidTotal
  };
};

export const getExpensesByType = (events: any[] | undefined, type: string) => {
  return events?.filter(event => 
    event.expense_type === type && event.expense_cost && event.expense_currency
  ) || [];
};

export const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};