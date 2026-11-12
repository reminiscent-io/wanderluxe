const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://wanderluxe.io';

// The request origin is accepted for signature compatibility; only
// ALLOWED_ORIGIN is ever allowed.
export function getCorsHeaders(_origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  };
}
