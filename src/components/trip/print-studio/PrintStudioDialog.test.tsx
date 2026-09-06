import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PrintStudioDialog from './PrintStudioDialog';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

let tier: string | null = 'pro';
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ subscriptionTier: tier, user: { id: 'u1' } }),
}));

let designRows: unknown[] = [];
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: designRows, error: null as Error | null }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

const renderDialog = (onOpenChange = vi.fn()) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PrintStudioDialog tripId="trip-1" open onOpenChange={onOpenChange} />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return onOpenChange;
};

beforeEach(() => {
  tier = 'pro';
  designRows = [];
  navigate.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PrintStudioDialog — generating state', () => {
  it('announces progress to assistive tech and offers a single spinner', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /design my edition/i }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/reading every day of your trip/i);
    // One spinner, not one in the body and another in the footer button.
    expect(document.querySelectorAll('.animate-spin')).toHaveLength(1);
  });

  it('cancels the in-flight request instead of leaving a dead close control', async () => {
    let captured: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        captured = init.signal as AbortSignal;
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
        });
      })
    );
    const onOpenChange = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /design my edition/i }));
    await screen.findByRole('status');

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => expect(captured?.aborted).toBe(true));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('PrintStudioDialog — theme field', () => {
  it('only counts characters once the limit is close enough to bite', () => {
    renderDialog();
    const input = screen.getByLabelText(/theme/i);

    fireEvent.change(input, { target: { value: 'a'.repeat(100) } });
    expect(screen.queryByText(/\/300/)).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'a'.repeat(260) } });
    expect(screen.getByText('260/300')).toBeInTheDocument();
  });
});

describe('PrintStudioDialog — non-Pro', () => {
  it('shows the upsell but still opens editions the trip already has', async () => {
    tier = 'free';
    designRows = [
      {
        id: 'design-1',
        theme_prompt: null,
        design: { themeName: 'Costiera', palette: { primary: '#123456', accent: '#654321' } },
        created_at: '2026-06-01T10:00:00Z',
      },
    ];
    renderDialog();

    expect(screen.getByRole('button', { name: /unlock the print studio/i })).toBeInTheDocument();

    const edition = await screen.findByRole('button', { name: /costiera/i });
    fireEvent.click(edition);
    expect(navigate).toHaveBeenCalledWith('/trip/trip-1/print/design-1');
  });
});
