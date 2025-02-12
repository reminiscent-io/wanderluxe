
/**
 * Formats a number as a string with 2 decimal places
 */
export const formatCost = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return value.toFixed(2);
};

/**
 * Parses a string input value to a number, handling common currency input patterns
 */
export const parseCost = (value: string): number | null => {
  // Remove any non-numeric characters except decimal point
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  // Return null for invalid numbers
  if (isNaN(parsed)) return null;
  
  // Round to 2 decimal places
  return Math.round(parsed * 100) / 100;
};

/**
 * Validates if a cost string is valid
 */
export const isValidCost = (value: string): boolean => {
  const parsed = parseCost(value);
  return parsed !== null && parsed >= 0;
};

/**
 * Formats a cost value for display with currency
 */
export const formatCostWithCurrency = (
  cost: number | null | undefined,
  currency: string = 'USD'
): string => {
  if (cost === null || cost === undefined) return '';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cost);
};
