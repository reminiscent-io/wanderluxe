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

describe('PrintDocument layouts', () => {
  const data = romeTrip();
  const dates = data.days.map((d) => d.date);
  const editorial = sanitizePrintDesign({}, dates);
  const bold = sanitizePrintDesign(
    { layout: 'bold', palette: { background: '#1b1030', fills: ['#ff00aa', '#00e5ff'] } },
    dates
  );
  const docOf = (container: HTMLElement) => container.querySelector<HTMLElement>('.print-doc')!;

  it('renders a design without a layout as editorial', () => {
    const { container } = render(<PrintDocument design={editorial} data={data} />);
    expect(docOf(container).getAttribute('data-layout')).toBe('editorial');
  });

  it('prints exactly the same words in the bold layout', () => {
    const plain = render(<PrintDocument design={editorial} data={data} />);
    const plainText = plain.container.textContent;
    plain.unmount();

    const loud = render(<PrintDocument design={bold} data={data} />);
    expect(docOf(loud.container).getAttribute('data-layout')).toBe('bold');
    expect(loud.container.textContent).toBe(plainText);
  });

  it('hands the fills to the stylesheet and cycles them through the days', () => {
    const { container } = render(<PrintDocument design={bold} data={data} />);
    const doc = docOf(container);
    expect(doc.style.getPropertyValue('--pd-fill-1')).toBe('#ff00aa');
    expect(doc.style.getPropertyValue('--pd-fill-2')).toBe('#00e5ff');
    expect(doc.style.getPropertyValue('--pd-fill-3')).toBe('#ff00aa');
    expect(doc.style.getPropertyValue('--pd-on-fill-1')).toBe(bold.palette.fills![0].text);

    const days = container.querySelectorAll<HTMLElement>('.pd-day');
    expect(days[0].style.getPropertyValue('--pd-day-fill')).toBe('#ff00aa');
    expect(days[1].style.getPropertyValue('--pd-day-fill')).toBe('#00e5ff');
    expect(days[1].style.getPropertyValue('--pd-day-on-fill')).toBe(bold.palette.fills![1].text);
  });

  it('borrows fills from the palette for an edition stored without them', () => {
    const { container } = render(<PrintDocument design={editorial} data={data} />);
    expect(docOf(container).style.getPropertyValue('--pd-fill-1')).toBe(editorial.palette.primary);
  });

  it('groups the cover title block so the bold layout can paint it as a panel', () => {
    const { container } = render(<PrintDocument design={bold} data={data} />);
    const panel = container.querySelector('.pd-cover-panel');
    expect(panel?.querySelector('.pd-cover-title')).not.toBeNull();
    expect(panel?.querySelector('.pd-eyebrow')).not.toBeNull();
  });
});

describe('PrintDocument page ground', () => {
  const data = romeTrip();
  const dates = data.days.map((d) => d.date);
  const docOf = (container: HTMLElement) => container.querySelector<HTMLElement>('.print-doc')!;

  it.each(['#1b1030', '#ff00aa'])('marks a tinted page background (%s) as data-ground="tinted"', (background) => {
    const design = sanitizePrintDesign({ palette: { background } }, dates);
    const { container } = render(<PrintDocument design={design} data={data} />);
    expect(docOf(container).getAttribute('data-ground')).toBe('tinted');
  });

  it('leaves data-ground absent for the fallback cream page', () => {
    const design = sanitizePrintDesign({}, dates);
    const { container } = render(<PrintDocument design={design} data={data} />);
    expect(docOf(container).getAttribute('data-ground')).toBeNull();
  });

  it('leaves data-ground absent for a near-white page background', () => {
    const design = sanitizePrintDesign({ palette: { background: '#fdfcf7' } }, dates);
    const { container } = render(<PrintDocument design={design} data={data} />);
    expect(docOf(container).getAttribute('data-ground')).toBeNull();
  });
});
