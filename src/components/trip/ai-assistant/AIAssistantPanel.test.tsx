import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

vi.mock('./ChatMessageList', () => ({ default: () => <div data-testid="message-list" /> }));
vi.mock('./ChatInput', () => ({ default: () => <div data-testid="chat-input" /> }));
vi.mock('./UsageMeter', () => ({ default: () => null }));
vi.mock('./PaywallModal', () => ({ default: () => null }));
vi.mock('./ItemStepperDialog', () => ({ default: () => null }));
vi.mock('./PromptChips', () => ({ default: () => null }));
// Stubbed like the other children: the real one reaches the Supabase client,
// which validates env at import time. Covered by DiscoverHint.test.tsx.
vi.mock('@/components/discovery/DiscoverHint', () => ({ default: () => null }));

const renderPanel = (props: { onCollapse?: () => void } = {}) => {
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
