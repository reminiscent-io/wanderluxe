import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerWanderluxeTools } from '../lib/mcpTools';

const router = express.Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Public origin of this deployment — used as the OAuth resource identifier and
// in discovery metadata. Override for tunnels/staging.
const publicBaseUrl = (process.env.MCP_PUBLIC_BASE_URL || 'https://wanderluxe.io').replace(/\/$/, '');

const RESOURCE_URL = `${publicBaseUrl}/mcp`;
const RESOURCE_METADATA_URL = `${publicBaseUrl}/.well-known/oauth-protected-resource/mcp`;

// Supabase Auth is the OAuth 2.1 authorization server; its issuer is the
// /auth/v1 path of the project URL. Tokens are ES256-signed user JWTs.
const issuer = supabaseUrl ? `${supabaseUrl}/auth/v1` : '';

// Lazily-created remote JWKS (jose caches and refreshes keys internally).
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  }
  return jwks;
}

// Claude.ai's egress is a shared IP block, so per-IP limits are effectively
// per-fleet — keep the ceiling well above the /api default to avoid one user's
// session starving another's.
const mcpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
});

/**
 * Validates the Bearer token as a Supabase-issued ES256 user JWT.
 * Returns the raw token (forwarded to PostgREST so RLS scopes all queries)
 * and the user id, or null if the token is missing/invalid/expired.
 *
 * Note: Supabase's OAuth server doesn't issue RFC 8707 resource-bound tokens;
 * `aud: "authenticated"` (the claim on all Supabase user tokens) is the
 * strictest audience check available here.
 */
async function authenticate(
  req: Request,
): Promise<{ token: string; userId: string; email: string | null } | null> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer,
      audience: 'authenticated',
      algorithms: ['ES256'],
    });
    if (!payload.sub) return null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    return { token, userId: payload.sub, email };
  } catch {
    return null;
  }
}

/** 401 with the WWW-Authenticate header Claude uses to discover our OAuth metadata. */
function unauthorized(res: Response) {
  res
    .status(401)
    .set(
      'WWW-Authenticate',
      `Bearer error="invalid_token", error_description="Valid Supabase access token required", resource_metadata="${RESOURCE_METADATA_URL}"`,
    )
    .json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized' },
      id: null,
    });
}

/** Per-request Supabase client carrying the user's token — all queries go through RLS. */
function createUserClient(token: string) {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function buildMcpServer(auth: { token: string; userId: string; email: string | null }): McpServer {
  const supabase = createUserClient(auth.token);

  const server = new McpServer(
    { name: 'wanderluxe', version: '0.2.0' },
    {
      instructions:
        "Tools for reading and managing the user's WanderLuxe trips. Call list_trips first to get trip IDs — they are not guessable. Add items by date (YYYY-MM-DD); the server resolves the matching trip day. Times are 24h HH:MM, local to the destination. To change a trip's dates in a way that would drop days containing items, the update_trip tool will first return the at-risk days for confirmation; re-call it with confirm_remove_days: true to proceed.",
    },
  );

  registerWanderluxeTools(server, supabase, { userId: auth.userId, email: auth.email });
  return server;
}

// --- OAuth protected resource metadata (RFC 9728) ---
// Claude derives this path from the connector URL (https://.../mcp) and also
// follows the resource_metadata hint in our 401 WWW-Authenticate header.
const protectedResourceMetadata = {
  resource: RESOURCE_URL,
  authorization_servers: [issuer],
  bearer_methods_supported: ['header'],
  scopes_supported: ['openid', 'email', 'profile'],
  resource_name: 'WanderLuxe',
  resource_documentation: `${publicBaseUrl}/about`,
};

router.get('/.well-known/oauth-protected-resource/mcp', (_req: Request, res: Response) => {
  res.json(protectedResourceMetadata);
});

// Some clients probe the root form as a fallback.
router.get('/.well-known/oauth-protected-resource', (_req: Request, res: Response) => {
  res.json(protectedResourceMetadata);
});

// --- MCP endpoint (streamable HTTP, stateless) ---
router.post('/mcp', mcpLimiter, async (req: Request, res: Response) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'MCP server is not configured' },
      id: null,
    });
    return;
  }

  const auth = await authenticate(req);
  if (!auth) {
    unauthorized(res);
    return;
  }

  try {
    // Fresh server + transport per request: no session state, nothing shared
    // across users, and the user's token is scoped to this request only.
    const server = buildMcpServer(auth);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

// Stateless transport: no SSE stream to resume and no session to delete.
router.get('/mcp', (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed' },
    id: null,
  });
});

router.delete('/mcp', (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed' },
    id: null,
  });
});

export default router;
