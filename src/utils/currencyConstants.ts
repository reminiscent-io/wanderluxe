// Define a union type for strong typing
export type Currency = 'USD' | 'EUR' | 'JPY' | 'GBP' | 'AUD' | 'CAD' | 'MXN' | 'CHF';

// Top currencies in order of popularity
export const CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'MXN', 'CHF'] as const;

// Mapping from currency code to full currency name
export const CURRENCY_NAMES: Record<Currency, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  JPY: 'Japanese Yen',
  GBP: 'British Pound',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  MXN: 'Mexican Peso',
  CHF: 'Swiss Franc'
} as const;

// Mapping from currency code to its symbol
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  JPY: '¥',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  MXN: 'MX$',
  CHF: 'Fr.'
} as const;
