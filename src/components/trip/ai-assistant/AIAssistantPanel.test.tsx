import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';
import AIAssistantPanel from './AIAssistantPanel';

vi.mock('@/hooks/useAIAssistant', () => ({
  useAIAssistant: () => ({
    messages: [],
    isLoading: false,
    isStreaming: false,
    streamingContent: '',
    error: null,
    usage: undefined,
    hasMore: false,
    isLoadingMore: false,
    isAnonymous: false,
    historyLoaded: true,
    sendMessage: vi.fn(),
    clearThread: vi.fn(),
    loadMoreMessages: vi.fn(),
    loadHistory: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDocumentExtraction', () => ({
  useDocumentExtraction: () => ({
    isExtracting: false,
    extractDocument: vi.fn(),
    updateItemStatus: vi.fn(),
    clearExtraction: vi.fn(),
  }),
}));

vi.mock('@/services/bulkImportService', () => ({ bulkImportItems: vi.fn() }));
vi.mock('@/services/placeCardAddService', () => ({
  addPlaceCardItem: vi.fn(),
  undoPlaceCardItem: vi.fn(),
}));

vi.mock('./ChatMessageList', () => ({
  default: ({ onAddPlaceCard }: { onAddPlaceCard?: unknown }) => (
    <div data-testid="message-list" data-can-add-place-cards={String(typeof onAddPlaceCard === 'function')} />
  ),
}));
vi.mock('./ChatInput', () => ({ default: () => <div data-testid="chat-input" /> }));
vi.mock('./UsageMeter', () => ({ default: () => null }));
vi.mock('./PaywallModal', () => ({ default: () => null }));
vi.mock('./ItemStepperDialog', () => ({ default: () => null }));
vi.mock('./PromptChips', () => ({ default: () => null }));
// Stubbed like the other children: the real one reaches the Supabase client,
// which validates env at import time. Covered by DiscoverHint.test.tsx.
vi.mock('@/components/discovery/DiscoverHint', () => ({ default: () => null }));

type PanelProps = Omit<React.ComponentProps<typeof AIAssistantPanel>, 'tripId'>;

const renderPanel = (props: PanelProps = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AIAssistantPanel tripId="trip-1" {...props} />
    </QueryClientProvider>
  );
};

describe('AIAssistantPanel collapse button', () => {
  it('renders the collapse button and calls onCollapse when provided', () => {
    const onCollapse = vi.fn();
    renderPanel({ onCollapse });
    fireEvent.click(screen.getByRole('button', { name: 'Collapse assistant' }));
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('renders no collapse button when onCollapse is absent', () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: 'Collapse assistant' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Expand assistant' })).not.toBeInTheDocument();
  });

  it('always renders the chat content (no internal collapsed state)', () => {
    renderPanel({ onCollapse: vi.fn() });
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });
});

describe('AIAssistantPanel fullscreen (mobile)', () => {
  it('renders nothing while closed', () => {
    renderPanel({ fullscreen: { open: false, onOpenChange: vi.fn() } });
    expect(screen.queryByTestId('message-list')).not.toBeInTheDocument();
  });

  it('minimizes through onOpenChange', () => {
    const onOpenChange = vi.fn();
    renderPanel({ fullscreen: { open: true, onOpenChange } });
    fireEvent.click(screen.getByRole('button', { name: 'Minimize assistant' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // The mobile drawer used to be a separate copy that never wired this up,
  // so place cards showed no "Add to trip" button on phones.
  it.each([
    ['dock', {}],
    ['fullscreen', { fullscreen: { open: true, onOpenChange: vi.fn() } }],
  ])('wires place-card adds in %s mode', (_mode, props) => {
    renderPanel(props as PanelProps);
    expect(screen.getByTestId('message-list')).toHaveAttribute('data-can-add-place-cards', 'true');
  });
});
