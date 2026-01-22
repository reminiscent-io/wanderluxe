// AI Assistant Types

export type MessageRole = 'user' | 'assistant' | 'system';
export type SubscriptionTier = 'free' | 'pro';
export type TravelItemType = 'accommodation' | 'transportation' | 'activity' | 'reservation';
export type ExtractedItemStatus = 'pending' | 'created' | 'skipped';

// File attachment for chat
export interface ChatFileAttachment {
  file: File;
  previewUrl: string;
  isConverted: boolean; // true if PDF was converted to image
  convertedFile?: File; // The converted PNG file if PDF
}

// Extracted item from document parsing
export interface ExtractedItem {
  id: string;
  itemType: TravelItemType;
  fields: Record<string, unknown>;
  missingRequired: string[];
  confidence: number;
  status: ExtractedItemStatus;
}

// Multi-item extraction response from edge function
export interface MultiItemExtractionResponse {
  items: ExtractedItem[];
  meta: {
    model: string;
    pagesUsed: number;
    totalItemsDetected: number;
    originalFileName: string;
  };
}

// Single-item extraction response (backwards compatible)
export interface SingleItemExtractionResponse {
  itemType: TravelItemType;
  fields: Record<string, unknown>;
  missingRequired: string[];
  meta: {
    model: string;
    pagesUsed: number;
  };
}

export interface AIChatThread {
  id: string;
  trip_id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIChatMessage {
  id: string;
  thread_id: string;
  role: MessageRole;
  content: string;
  metadata: MessageMetadata;
  created_at: string;

  // For extraction results in chat
  extractedItems?: ExtractedItem[];
  extractionMeta?: {
    model: string;
    pagesUsed: number;
    originalFileName: string;
  };
  // For user messages with file attachments
  attachmentPreviewUrl?: string;
  attachmentFileName?: string;
}

export interface MessageMetadata {
  model?: string;
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  context_used?: string[];
  error?: string;
}

export interface UserAIUsage {
  id: string;
  user_id: string;
  date: string;
  message_count: number;
}

export interface AIUsageInfo {
  used: number;
  limit: number;
  tier: SubscriptionTier;
  resetAt: string;
}

// API Request/Response types
export interface SendMessageRequest {
  message: string;
  thread_id?: string;
}

export interface SendMessageResponse {
  thread_id: string;
  message_id: string;
}

export interface UsageCheckResponse {
  allowed: boolean;
  current_count: number;
  daily_limit: number;
}

export interface StreamingErrorResponse {
  code: 'DAILY_LIMIT_REACHED' | 'UNAUTHORIZED' | 'TRIP_ACCESS_DENIED' | 'INTERNAL_ERROR';
  message: string;
  limit?: number;
  used?: number;
  resetAt?: string;
}

// SSE Event types
export interface SSEMessageEvent {
  type: 'message';
  content: string;
}

export interface SSEDoneEvent {
  type: 'done';
  message_id: string;
  thread_id: string;
}

export interface SSEErrorEvent {
  type: 'error';
  error: StreamingErrorResponse;
}

export type SSEEvent = SSEMessageEvent | SSEDoneEvent | SSEErrorEvent;

// Hook return type
export interface UseAIAssistantReturn {
  // State
  messages: AIChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  usage: AIUsageInfo | null;
  threadId: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearThread: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
}

// Prompt chip type
export interface PromptChip {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

// Trip context for AI system prompt
export interface TripContextForAI {
  destination: string;
  arrival_date: string;
  departure_date: string;
  days_count: number;
  days: TripDayContext[];
  accommodations: AccommodationContext[];
  transportation: TransportationContext[];
}

export interface TripDayContext {
  date: string;
  title: string | null;
  activities: ActivityContext[];
}

export interface ActivityContext {
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface AccommodationContext {
  hotel: string;
  checkin_date: string;
  checkout_date: string;
  address: string | null;
}

export interface TransportationContext {
  type: string;
  provider: string | null;
  departure_location: string | null;
  arrival_location: string | null;
  start_date: string;
  start_time: string | null;
}
