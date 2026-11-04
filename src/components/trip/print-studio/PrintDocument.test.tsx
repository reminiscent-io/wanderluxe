import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrintDocument from './PrintDocument';
import { sanitizePrintDesign } from '@/lib/printDesign/spec';
import { applyCopyOverrides } from '@/lib/printDesign/edits';
import { buildPrintTrip, type PrintTripRows } from '@/lib/printDesign/trip';

/** Three days in Rome, every money path filled in: item costs, a stay, other spend, a budget. */
function romeRows(overrides: Partial<PrintTripRows> = {}): PrintTripRows {
  return {
    trip: { destination: 'Rome', arrival_date: '2026-04-10', departure_date: '2026-04-12', timezone: 'Europe/Rome', budget: 6000 },
    days: [
      { day_id: 'r1', date: '2026-04-10', title: 'Arrival and Trastevere', description: null },
      { day_id: 'r2', date: '2026-04-11', title: null, description: null },
      { day_id: 'r3', date: '2026-04-12', title: null, description: null },
    ],
    stays: [{ hotel: 'Hotel Locarno', hotel_checkin_date: '2026-04-10', hotel_checkout_date: '2026-04-12', cost: 780, currency: 'EUR' }],
    trans: [{ type: 'flight', provider: 'ITA', start_date: '2026-04-10', start_time: '09:00', departure_location: 'JFK', arrival_location: 'FCO', cost: 1240, currency: 'EUR' }],
    acts: [
      { day_id: 'r1', title: 'Vatican Museums', start_time: '14:00', cost: 110, currency: 'EUR' },
      { day_id: 'r2', title: 'Borghese Gallery', start_time: '10:00', cost: 160, currency: 'EUR' },
    ],
    dine: [{ day_id: 'r2', restaurant_name: 'Roscioli', reservation_time: '20:00', cost: 190, currency: 'EUR' }],
    otherExpenses: [{ cost: 68 }],
    ...overrides,
  };
}

const romeTrip = (overrides?: Partial<PrintTripRows>) => buildPrintTrip(romeRows(overrides));
const designFor = (raw: unknown = {}) => sanitizePrintDesign(raw, ['2026-04-10', '2026-04-11', '2026-04-12']);
const kinds = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('.pd-sheet')).map((s) => s.dataset.pdKind);

describe('PrintDocument pages', () => {
  it('lays a three-day trip out as Letter sheets, cover first and back page last', () => {
    const { container } = render(<PrintDocument design={designFor()} trip={romeTrip()} />);
    expect(kinds(container)).toEqual(['cover', 'overview', 'day', 'day', 'day', 'back']);
    expect(container.querySelector('.print-doc')?.getAttribute('data-pages')).toBe('6');
  });

  it('puts the bookings on the overview when there are few', () => {
    const trip = romeTrip({
      stays: [],
      trans: [{ type: 'flight', provider: 'ITA', start_date: '2026-04-10', start_time: '09:00', confirmation_number: 'AZ610X' }],
    });
    const { container } = render(<PrintDocument design={designFor()} trip={trip} />);
    expect(kinds(container)).toEqual(['cover', 'overview', 'day', 'day', 'day', 'back']);
    expect(screen.getAllByText('AZ610X').length).toBeGreaterThan(0);
    expect(container.querySelector('[data-pd-block="details-panel"]')).not.toBeNull();
  });

  it('heads each day with its weekday and date, and the traveler’s own title', () => {
    render(<PrintDocument design={designFor()} trip={romeTrip()} />);
    expect(screen.getAllByText(/Friday, April 10/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Arrival and Trastevere').length).toBeGreaterThan(0);
  });

  it('prefers the design’s headline, and hides one the traveler blanked', () => {
    const design = { ...designFor(), dayHeadlines: { '2026-04-11': 'Borghese, then Roscioli', '2026-04-10': '' } };
    render(<PrintDocument design={design} trip={romeTrip()} />);
    expect(screen.getAllByText('Borghese, then Roscioli').length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('heading', { name: 'Arrival and Trastevere' })).toHaveLength(0);
  });

  it('draws a single page for a thumbnail', () => {
    const cover = render(<PrintDocument design={designFor()} trip={romeTrip()} select="cover" />);
    expect(kinds(cover.container)).toEqual(['cover']);
    cover.unmount();
    const day = render(<PrintDocument design={designFor()} trip={romeTrip()} select="first-day" />);
    expect(kinds(day.container)).toEqual(['day']);
    expect(screen.getByText('Vatican Museums')).not.toBeNull();
  });

  it('reveals empty optional slots while editing', () => {
    const renderCopy = (key: string, value: string) => <span data-field={key}>{value}</span>;
    const { container } = render(
      <PrintDocument design={designFor()} trip={romeTrip()} renderCopy={renderCopy} isEditing />
    );
    expect(container.querySelector('[data-field="cover.tagline"]')).not.toBeNull();
    expect(container.querySelector('[data-field="day.2026-04-11"]')).not.toBeNull();
  });
});

describe('PrintDocument money', () => {
  const ITEM_PRICES = ['€110.00', '€160.00', '€190.00', '€780.00', '€1,240.00'];

  it('never prints a price on an itinerary item, even with the budget on', () => {
    const { container } = render(<PrintDocument design={designFor()} trip={romeTrip()} showBudget />);
    for (const price of ITEM_PRICES) expect(container.textContent).not.toContain(price);
  });

  it('leaves the Ledger out by default', () => {
    const { container } = render(<PrintDocument design={designFor()} trip={romeTrip()} />);
    expect(kinds(container)).not.toContain('ledger');
    expect(screen.queryByText(/trip budget of/)).toBeNull();
  });

  it('adds the Ledger before the back page when the traveler opts in', () => {
    const { container } = render(<PrintDocument design={designFor()} trip={romeTrip()} showBudget />);
    expect(kinds(container).slice(-2)).toEqual(['ledger', 'back']);
    expect(screen.getByText('Planned spend')).not.toBeNull();
    expect(screen.getByText('Against a trip budget of $6,000.00.')).not.toBeNull();
  });

  it('draws no empty Ledger for a trip with no costs or budget', () => {
    const free = romeTrip({
      trip: { destination: 'Rome', arrival_date: '2026-04-10', departure_date: '2026-04-12', budget: null },
      acts: [],
      stays: [],
      trans: [],
      dine: [],
      otherExpenses: [],
    });
    const { container } = render(<PrintDocument design={designFor()} trip={free} showBudget />);
    expect(kinds(container)).not.toContain('ledger');
  });
});

describe('PrintDocument edition name', () => {
  const nameOf = (container: HTMLElement) => container.querySelector('.pd-back-credit')?.textContent ?? '';

  it('reads as one edition for the fallback theme name', () => {
    const { container } = render(<PrintDocument design={designFor()} trip={romeTrip()} />);
    expect(nameOf(container)).toMatch(/^The Traveler’s edition/);
  });

  it('adds edition after an ordinary theme name, and never doubles it', () => {
    const plain = render(<PrintDocument design={{ ...designFor(), themeName: 'Aegean Deco' }} trip={romeTrip()} />);
    expect(nameOf(plain.container)).toMatch(/^The Aegean Deco edition/);
    plain.unmount();
    const own = render(<PrintDocument design={{ ...designFor(), themeName: 'Sun-Bleached Edition' }} trip={romeTrip()} />);
    expect(nameOf(own.container)).toMatch(/^The Sun-Bleached EditionMade/);
  });

  it('does not double it on a traveler’s own name either', () => {
    const design = applyCopyOverrides(designFor(), { themeName: 'Harbour edition' });
    const renderCopy = (key: string, value: string) => <span data-field={key}>{value}</span>;
    const { container } = render(<PrintDocument design={design} trip={romeTrip()} renderCopy={renderCopy} />);
    expect(nameOf(container)).toMatch(/^The Harbour editionMade/);
  });
});

describe('PrintDocument layouts', () => {
  const editorial = designFor();
  const bold = designFor({ layout: 'bold', palette: { background: '#1b1030', fills: ['#ff00aa', '#00e5ff'] } });
  const docOf = (container: HTMLElement) => container.querySelector<HTMLElement>('.print-doc')!;

  it('renders a design without a layout as editorial', () => {
    const { container } = render(<PrintDocument design={editorial} trip={romeTrip()} />);
    expect(docOf(container).getAttribute('data-layout')).toBe('editorial');
  });

  it('prints exactly the same words in the bold layout', () => {
    const plain = render(<PrintDocument design={editorial} trip={romeTrip()} />);
    const plainText = plain.container.textContent;
    plain.unmount();
    const loud = render(<PrintDocument design={bold} trip={romeTrip()} />);
    expect(docOf(loud.container).getAttribute('data-layout')).toBe('bold');
    expect(loud.container.textContent).toBe(plainText);
  });

  it('hands the fills to the stylesheet and cycles them through the days', () => {
    const { container } = render(<PrintDocument design={bold} trip={romeTrip()} />);
    const doc = docOf(container);
    expect(doc.style.getPropertyValue('--pd-fill-1')).toBe('#ff00aa');
    expect(doc.style.getPropertyValue('--pd-fill-2')).toBe('#00e5ff');
    expect(doc.style.getPropertyValue('--pd-fill-3')).toBe('#ff00aa');
    const days = container.querySelectorAll<HTMLElement>('.pd-sheet--day');
    expect(days[0].style.getPropertyValue('--pd-day-fill')).toBe('#ff00aa');
    expect(days[1].style.getPropertyValue('--pd-day-fill')).toBe('#00e5ff');
    expect(days[1].style.getPropertyValue('--pd-day-on-fill')).toBe(bold.palette.fills![1].text);
    expect(days[0].classList.contains('pd-sheet--band')).toBe(true);
  });

  it('borrows fills from the palette for an edition stored without them', () => {
    const { container } = render(<PrintDocument design={editorial} trip={romeTrip()} />);
    expect(docOf(container).style.getPropertyValue('--pd-fill-1')).toBe(editorial.palette.primary);
  });
});
