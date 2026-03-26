const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://wanderluxe.io';

const ALLOWED_ORIGIN_PATTERNS = [
  /\.replit\.dev(:\d+)?$/,
  /\.repl\.co(:\d+)?$/,
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  let allowOrigin = ALLOWED_ORIGIN;
  if (origin && ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin))) {
    allowOrigin = origin;
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  };
}
