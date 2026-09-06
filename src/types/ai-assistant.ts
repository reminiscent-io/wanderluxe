// AI Assistant Types

export type MessageRole = 'user' | 'assistant' | 'system';
export type SubscriptionTier = 'free' | 'pro' | 'anon';
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

// Rich place recommendation card. All URLs + structured fields are populated
// server-side from verified Google Places results — the model only authors
// blurb, tags, an optional booking_url, and an optional suggested_add payload
// that is validated against the trip's date window before being offered.
export interface PlaceCard {
  id: string;
  place_id: string;
  name: string;
  address: string;
  maps_url: string;
  website?: string;
  rating?: number;
  price_level?: number;
  phone?: string;
  photo_url?: string;
  booking_url?: string;
  blurb?: string;
  tags?: string[];
  // True when the card represents a hotel/stay. Set by the model (and forwarded
  // by the server) so the client can show Expedia booking even before the user
  // has supplied check-in/out dates.
  is_stay?: boolean;
  suggested_add?: {
    itemType: 'reservation' | 'activity' | 'accommodation';
    fields: Record<string, unknown>;
  };
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
  // Rich place cards streamed alongside the assistant response.
  placeCards?: PlaceCard[];
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

/**
 * Error codes the assistant can surface. These are the union of what the
 * Express proxy (`server/routes/ai-chat.ts`) and the `ai-chat` Edge Function
 * actually emit — keep this in sync with both when adding a code.
 */
export type StreamingErrorCode =
  | 'DAILY_LIMIT_REACHED'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'NOT_PUBLIC'
  | 'CONFIG_ERROR'
  | 'INTERNAL_ERROR'
  | 'ERROR';

export interface StreamingErrorResponse {
  code: StreamingErrorCode;
  message: string;
  limit?: number;
  used?: number;
  resetAt?: string;
  /** Seconds until the per-minute rate limit window reopens (RATE_LIMITED). */
  retryAfter?: number;
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
  /** When create_items was stripped, use this for display instead of accumulated stream content */
  content?: string;
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
  isAnonymous: boolean;
  historyLoaded: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearThread: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  loadHistory: () => Promise<void>;
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
