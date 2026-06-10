/**
 * Locale-pinned formatters for the PDF.
 * en-US is intentional: the exported document must look identical no matter
 * which browser/locale generated it.
 */

export function fmtMoney(amount: number, currency?: string | null): string {
  const code = currency || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).format(amount);
  } catch {
    // Unknown/invalid ISO code in user data — show it verbatim.
    return `${code} ${amount.toFixed(2)}`;
  }
}
