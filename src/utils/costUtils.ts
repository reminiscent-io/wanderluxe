
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
  // Remove commas and other formatting characters except decimal point and negative sign
  const cleaned = value.replace(/[^\d.-]/g, '');
  
  // Handle special cases
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) return null;
  
  // If we have a decimal point, limit to 2 decimal places
  const formattedValue = parts[0] + (parts.length > 1 ? '.' + parts[1].slice(0, 2) : '');
  
  // Parse the final value
  const parsed = parseFloat(formattedValue);
  
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
