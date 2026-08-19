import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DiscoverHint from './DiscoverHint';

const rpc = vi.fn().mockResolvedValue({ error: null });
const maybeSingle = vi.fn().mockResolvedValue({ data: { discovery_state: {} }, error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => maybeSingle() }),
      }),
    }),
  },
}));

let mockSession: { user: { id: string } } | null = { user: { id: 'user-1' } };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ session: mockSession }),
}));

const renderHint = (props: Partial<React.ComponentProps<typeof DiscoverHint>> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DiscoverHint hint="map-view" {...props}>
        See your days on a map.
      </DiscoverHint>
    </QueryClientProvider>,
  );

describe('DiscoverHint', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockSession = { user: { id: 'user-1' } };
    rpc.mockClear();
    maybeSingle.mockResolvedValue({ data: { discovery_state: {} }, error: null });
  });

  it('shows an unseen hint', () => {
    renderHint();
    expect(screen.getByText('See your days on a map.')).toBeInTheDocument();
  });

  it('stays hidden while its trigger condition is false', () => {
    renderHint({ when: false });
    expect(screen.queryByText('See your days on a map.')).not.toBeInTheDocument();
  });

  it('does not show to anonymous visitors — there is nowhere to remember a dismissal', () => {
    mockSession = null;
    renderHint();
    expect(screen.queryByText('See your days on a map.')).not.toBeInTheDocument();
  });

  it('dismisses, remembers locally, and records the dismissal server-side', () => {
    renderHint();
    fireEvent.click(screen.getByRole('button', { name: /dismiss tip/i }));

    expect(screen.queryByText('See your days on a map.')).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('wl.discovery')!)).toEqual({ 'map-view': true });
    expect(rpc).toHaveBeenCalledWith('mark_discovery_seen', { discovery_key: 'map-view' });
  });

  it('does not return once already dismissed on this device', () => {
    window.localStorage.setItem('wl.discovery', JSON.stringify({ 'map-view': true }));
    renderHint();
    expect(screen.queryByText('See your days on a map.')).not.toBeInTheDocument();
  });

  it('running the action also marks the hint seen', () => {
    const onAction = vi.fn();
    renderHint({ actionLabel: 'Show me', onAction });

    fireEvent.click(screen.getByRole('button', { name: 'Show me' }));

    expect(onAction).toHaveBeenCalledOnce();
    expect(JSON.parse(window.localStorage.getItem('wl.discovery')!)).toEqual({ 'map-view': true });
  });

  it('keeps other hints untouched when one is dismissed', () => {
    window.localStorage.setItem('wl.discovery', JSON.stringify({ 'doc-import': true }));
    renderHint();

    fireEvent.click(screen.getByRole('button', { name: /dismiss tip/i }));

    expect(JSON.parse(window.localStorage.getItem('wl.discovery')!)).toEqual({
      'doc-import': true,
      'map-view': true,
    });
  });
});
