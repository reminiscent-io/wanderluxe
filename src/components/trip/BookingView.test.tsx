import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BookingView from './BookingView';

const auth = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }) }));

vi.mock('@/lib/expedia', () => ({
  EXPEDIA_FALLBACK_URL: 'https://expedia.com/affiliates/wanderluxe_travel/wanderluxe',
  EXPEDIA_WIDGET_CAMREF: 'test-camref',
  mountExpediaWidget: vi.fn(() => () => {}),
  trackExpediaClick: vi.fn(),
}));

describe('BookingView', () => {
  let openSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    auth.user = null;
    toast.mockClear();
    openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as { gtag?: unknown }).gtag;
  });

  const clickContact = () => {
    fireEvent.click(screen.getByRole('button', { name: /contact kevin on fora travel/i }));
  };

  it('opens the Fora Travel profile when logged out', () => {
    render(<BookingView tripId="trip-1" />);
    clickContact();
    expect(openSpy).toHaveBeenCalledWith('https://www.foratravel.com/advisor/kevin-lowe', '_blank');
    expect(toast).toHaveBeenCalled();
  });

  it('opens the Fora Travel profile when gtag is unavailable', () => {
    auth.user = { id: 'user-1' };
    render(<BookingView tripId="trip-1" />);
    clickContact();
    expect(openSpy).toHaveBeenCalledWith('https://www.foratravel.com/advisor/kevin-lowe', '_blank');
  });

  it('fires the advisor_contact analytics event when logged in', () => {
    auth.user = { id: 'user-1' };
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    render(<BookingView tripId="trip-1" />);
    clickContact();
    expect(gtag).toHaveBeenCalledWith('event', 'advisor_contact', expect.objectContaining({ event_label: 'trip-1' }));
    expect(openSpy).toHaveBeenCalledWith('https://www.foratravel.com/advisor/kevin-lowe', '_blank');
  });

  it('keeps both booking cards shrinkable inside the grid (min-w-0)', () => {
    const { container } = render(<BookingView tripId="trip-1" />);
    const grid = container.querySelector('.grid');
    expect(grid).not.toBeNull();
    const cards = Array.from(grid!.children);
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card.className).toContain('min-w-0');
    }
  });
});
