import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { summarizeCosts } from '../lib/budgetSummary';

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
async function authenticate(req: Request): Promise<{ token: string; userId: string } | null> {
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
    return { token, userId: payload.sub };
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

function toolResult(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

function toolError(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false };

function buildMcpServer(token: string): McpServer {
  const supabase = createUserClient(token);

  const server = new McpServer(
    { name: 'wanderluxe', version: '0.1.0' },
    {
      instructions:
        'Tools for reading the user\'s WanderLuxe trips. Call list_trips first to get trip IDs — they are not guessable. Dates are ISO (YYYY-MM-DD); times are 24h local to the destination.',
    },
  );

  server.registerTool(
    'list_trips',
    {
      description:
        'List the trips the user owns or that are shared with them, newest first. Returns trip_id, destination, dates, and budget.',
      annotations: READ_ONLY,
    },
    async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('trip_id,destination,arrival_date,departure_date,budget,created_at')
        .order('arrival_date', { ascending: false });
      if (error) return toolError(`Failed to list trips: ${error.message}`);
      return toolResult({ trips: data ?? [] });
    },
  );

  server.registerTool(
    'get_trip',
    {
      description:
        'Get the full itinerary for one trip: day-by-day activities and dining reservations, plus accommodations and transportation. Use list_trips to find the trip_id.',
      inputSchema: { trip_id: z.string().uuid().describe('Trip ID from list_trips') },
      annotations: READ_ONLY,
    },
    async ({ trip_id }) => {
      const [tripRes, daysRes, staysRes, transportRes, activitiesRes, diningRes] = await Promise.all([
        supabase
          .from('trips')
          .select('trip_id,destination,arrival_date,departure_date,budget')
          .eq('trip_id', trip_id)
          .maybeSingle(),
        supabase
          .from('trip_days')
          .select('day_id,date,title,description')
          .eq('trip_id', trip_id)
          .order('date'),
        supabase
          .from('accommodations')
          .select(
            'stay_id,hotel,hotel_address,hotel_checkin_date,hotel_checkout_date,checkin_time,checkout_time,hotel_phone,hotel_website,cost,currency',
          )
          .eq('trip_id', trip_id),
        supabase
          .from('transportation')
          .select(
            'id,type,provider,flight_number,confirmation_number,departure_location,arrival_location,start_date,start_time,end_date,end_time,cost,currency',
          )
          .eq('trip_id', trip_id)
          .order('start_date'),
        supabase
          .from('day_activities')
          .select('id,day_id,title,description,start_time,end_time,location_address,cost,currency')
          .eq('trip_id', trip_id),
        supabase
          .from('reservations')
          .select(
            'id,day_id,restaurant_name,reservation_time,number_of_people,address,confirmation_number,notes,cost,currency',
          )
          .eq('trip_id', trip_id),
      ]);

      // RLS filters trips the user can't see, so "not found" and "no access" look identical.
      if (tripRes.error) return toolError(`Failed to load trip: ${tripRes.error.message}`);
      if (!tripRes.data) return toolError('Trip not found, or you do not have access to it.');

      const activitiesByDay = new Map<string, unknown[]>();
      for (const a of activitiesRes.data ?? []) {
        const { day_id, ...rest } = a;
        const list = activitiesByDay.get(day_id) ?? [];
        list.push(rest);
        activitiesByDay.set(day_id, list);
      }
      const diningByDay = new Map<string, unknown[]>();
      for (const r of diningRes.data ?? []) {
        const { day_id, ...rest } = r;
        if (!day_id) continue;
        const list = diningByDay.get(day_id) ?? [];
        list.push(rest);
        diningByDay.set(day_id, list);
      }

      const days = (daysRes.data ?? []).map((d) => ({
        date: d.date,
        title: d.title,
        description: d.description,
        activities: activitiesByDay.get(d.day_id) ?? [],
        dining: diningByDay.get(d.day_id) ?? [],
      }));

      return toolResult({
        trip: tripRes.data,
        days,
        accommodations: staysRes.data ?? [],
        transportation: transportRes.data ?? [],
      });
    },
  );

  server.registerTool(
    'get_trip_budget',
    {
      description:
        'Get the budget breakdown for one trip: total budget, spend per category (accommodations, transportation, activities, dining, other), and paid vs unpaid amounts.',
      inputSchema: { trip_id: z.string().uuid().describe('Trip ID from list_trips') },
      annotations: READ_ONLY,
    },
    async ({ trip_id }) => {
      const [tripRes, staysRes, transportRes, activitiesRes, diningRes, otherRes] = await Promise.all([
        supabase.from('trips').select('budget').eq('trip_id', trip_id).maybeSingle(),
        supabase.from('accommodations').select('cost,currency,amount_paid,is_paid').eq('trip_id', trip_id),
        supabase.from('transportation').select('cost,currency').eq('trip_id', trip_id),
        supabase.from('day_activities').select('cost,currency,amount_paid,is_paid').eq('trip_id', trip_id),
        supabase.from('reservations').select('cost,currency,amount_paid,is_paid').eq('trip_id', trip_id),
        supabase
          .from('other_expenses')
          .select('description,cost,currency,amount_paid,is_paid')
          .eq('trip_id', trip_id),
      ]);

      if (tripRes.error) return toolError(`Failed to load trip: ${tripRes.error.message}`);
      if (!tripRes.data) return toolError('Trip not found, or you do not have access to it.');

      const categories = {
        accommodations: summarizeCosts(staysRes.data),
        transportation: summarizeCosts(transportRes.data),
        activities: summarizeCosts(activitiesRes.data),
        dining: summarizeCosts(diningRes.data),
        other: summarizeCosts(otherRes.data),
      };
      const totalCost = Object.values(categories).reduce((sum, c) => sum + c.total, 0);
      const totalPaid = Object.values(categories).reduce((sum, c) => sum + c.paid, 0);

      return toolResult({
        budget: tripRes.data.budget,
        total_cost: totalCost,
        total_paid: totalPaid,
        categories,
        other_expenses: otherRes.data ?? [],
        note: 'Amounts are in each item\'s own currency; check `currencies` per category before summing across categories.',
      });
    },
  );

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
    const server = buildMcpServer(auth.token);
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
