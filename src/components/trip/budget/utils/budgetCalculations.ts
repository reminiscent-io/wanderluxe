import { CURRENCY_SYMBOLS } from '@/utils/currencyConstants';

export function formatCurrencyWithSymbol(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency;

  // Format number with commas and proper decimal places
  const formatNumber = (num: number, decimals: number = 2): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  };

  if (currency === 'JPY') {
    return `${symbol}${formatNumber(Math.round(amount), 0)}`;
  }

  if (symbol === currency) {
    return `${formatNumber(amount)} ${currency}`;
  } else {
    return `${symbol}${formatNumber(amount)}`;
  }
}

