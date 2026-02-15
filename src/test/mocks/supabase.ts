import { vi } from 'vitest';

// Mock response builder for chaining
export const createMockSupabaseResponse = <T>(data: T | null, error: any = null) => ({
  data,
  error,
});

// Mock query builder that supports chaining
export const createMockQueryBuilder = () => {
  const mockResponse = { data: null, error: null };

  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(mockResponse),
    maybeSingle: vi.fn().mockResolvedValue(mockResponse),
    // Allow setting response for testing
    _setResponse: (data: any, error: any = null) => {
      mockResponse.data = data;
      mockResponse.error = error;
    },
  };

  // Make all methods resolve with mockResponse when called as terminal
  Object.keys(builder).forEach((key) => {
    if (key !== '_setResponse' && typeof builder[key] === 'function') {
      const original = builder[key];
      builder[key] = vi.fn((...args: any[]) => {
        const result = original(...args);
        // If it returns `this`, also make it thenable
        if (result === builder) {
          result.then = (resolve: any) => resolve(mockResponse);
        }
        return result;
      });
    }
  });

  return builder;
};

// Create a full mock Supabase client
export const createMockSupabaseClient = () => {
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user-id' } } }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  };

  const mockFrom = vi.fn().mockReturnValue(createMockQueryBuilder());

  return {
    auth: mockAuth,
    from: mockFrom,
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  };
};

// Default mock client instance
export const mockSupabase = createMockSupabaseClient();
