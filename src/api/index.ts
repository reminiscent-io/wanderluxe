
import { sendResearchQuery } from './research-chat';

// Middleware to handle API requests from the frontend
export const handleApiRequest = async (endpoint: string, data: any) => {
  switch (endpoint) {
    case '/api/research-chat':
      return await sendResearchQuery(data.query, data.tripId);
    default:
      throw new Error(`Unknown endpoint: ${endpoint}`);
  }
};

// Create a fetch override for our API routes
const originalFetch = window.fetch;
window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
  const inputUrl = input instanceof Request ? input.url : input.toString();
  
  // Only intercept our API routes
  if (inputUrl.startsWith('/api/')) {
    try {
      const data = init?.body ? JSON.parse(init.body.toString()) : {};
      const result = await handleApiRequest(inputUrl, data);
      
      // Mock a successful response
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('API request error:', error);
      
      // Mock an error response
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // For all other requests, use the original fetch
  return originalFetch.apply(window, [input, init]);
};
