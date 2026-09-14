import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrintDocument from './PrintDocument';
import { romeTrip } from '@/services/pdf/fixtures';
import { sanitizePrintDesign } from '@/lib/printDesign/spec';
import type { PdfTripData } from '@/services/pdf/types';

// The fixture's items carry prices (€110.00, $1,240.00, …) and the trip has a
// budget, so every money path in the document has something to show.
function renderDocument(showBudget?: boolean) {
  const data = romeTrip();
  const design = sanitizePrintDesign({}, data.days.map((d) => d.date));
  return render(<PrintDocument design={design} data={data} showBudget={showBudget} />);
}

const ITEM_PRICES = ['€780.00', '$1,240.00', '€110.00', '€160.00', '€68.00', '€190.00'];

describe('PrintDocument money', () => {
  it('never prints a price on an itinerary item, even with the budget on', () => {
    const { container } = renderDocument(true);
    for (const price of ITEM_PRICES) {
      expect(container.textContent).not.toContain(price);
    }
  });

  it('leaves the Ledger out by default', () => {
    renderDocument();
    expect(screen.queryByText('The Ledger')).toBeNull();
    expect(screen.queryByText(/trip budget of/)).toBeNull();
  });

  it('draws the Ledger at the end when the traveler opts in', () => {
    renderDocument(true);
    expect(screen.getByText('The Ledger')).not.toBeNull();
    expect(screen.getByText('Planned spend')).not.toBeNull();
    expect(screen.getByText('Against a trip budget of $6,000.00.')).not.toBeNull();
  });

  it('draws no empty Ledger for a trip with no costs or budget', () => {
    const data: PdfTripData = { ...romeTrip(), budgetData: { budget: null, categories: [], total: 0 } };
    const design = sanitizePrintDesign({}, data.days.map((d) => d.date));
    render(<PrintDocument design={design} data={data} showBudget />);
    expect(screen.queryByText('The Ledger')).toBeNull();
  });
});
