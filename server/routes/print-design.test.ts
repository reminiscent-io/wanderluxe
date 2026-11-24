// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

// Every Supabase read the generate route makes, answered per table. Each
// builder method returns the builder; single()/maybeSingle() resolve the row.
let tier: 'free' | 'pro' = 'free';
let consumeAllowed = true;
const rpc = vi.fn();
const inserted = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@example.com' } }, error: null }) },
    rpc: (name: string, args: unknown) => {
      rpc(name, args);
      if (name === 'consume_print_design') {
        return Promise.resolve({ data: [{ allowed: consumeAllowed, used: 1 }], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    from: (table: string) => {
      const row =
        table === 'profiles' ? { subscription_tier: tier }
        : table === 'trips' ? { trip_id: 't' }
        : table === 'trip_print_designs' ? { id: 'd1', created_at: '2026-11-17T00:00:00Z' }
        : table === 'print_design_usage' ? { design_count: 1 }
        : null;
      const b: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'ilike', 'gte', 'order', 'limit', 'update']) b[m] = () => b;
      b.insert = (v: unknown) => { inserted(v); return b; };
      b.single = b.maybeSingle = async () => ({ data: row, error: null });
      return b;
    },
  }),
}));

const generate = vi.fn();
vi.mock('../lib/printDesign', () => ({
  generatePrintDesign: (...a: unknown[]) => generate(...a),
  PrintDesignError: class PrintDesignError extends Error {
    status = 502;
  },
}));
vi.mock('../lib/printSnapshot', () => ({ fetchTripSnapshot: async () => ({ trip: {} }) }));

const TRIP = '00000000-0000-4000-8000-000000000001';
let server: Server;
let base: string;
let helpers: typeof import('./print-design');

beforeAll(async () => {
  process.env.VITE_SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.OPENAI_API_KEY = 'sk-test';
  helpers = await import('./print-design');
  const express = (await import('express')).default;
  const app = express();
  app.use(express.json());
  app.use(helpers.default);
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server?.close());

beforeEach(() => {
  tier = 'free';
  consumeAllowed = true;
  rpc.mockClear();
  inserted.mockClear();
  generate.mockReset();
  generate.mockResolvedValue({ design: { themeName: 'X' }, model: 'gpt-test' });
});

const post = () =>
  fetch(`${base}/api/trips/${TRIP}/print-design`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jwt' },
    body: '{}',
  });

describe('daily limits', () => {
  it('gives every member one edition a day and Pro ten', () => {
    expect(helpers.dailyDesignLimit('free')).toBe(1);
    expect(helpers.dailyDesignLimit(null)).toBe(1);
    expect(helpers.dailyDesignLimit('pro')).toBe(10);
  });

  it('counts days in UTC and rolls over at the next midnight', () => {
    expect(helpers.quotaDay(new Date('2026-11-17T23:59:00-08:00'))).toEqual({
      date: '2026-11-18',
      resetsAt: '2026-11-19T00:00:00.000Z',
    });
  });
});

describe('POST /api/trips/:tripId/print-design', () => {
  it('lets a free member design within today’s edition, spending it against the free limit', async () => {
    const resp = await post();
    expect(resp.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('consume_print_design', expect.objectContaining({ p_user_id: 'u1', p_limit: 1 }));
    expect(inserted).toHaveBeenCalledTimes(1);
  });

  it('spends a Pro member’s edition against the Pro limit', async () => {
    tier = 'pro';
    await post();
    expect(rpc).toHaveBeenCalledWith('consume_print_design', expect.objectContaining({ p_limit: 10 }));
  });

  it('refuses once today is spent, without calling the model', async () => {
    consumeAllowed = false;
    const resp = await post();
    expect(resp.status).toBe(429);
    expect(await resp.json()).toMatchObject({ code: 'DAILY_LIMIT_REACHED', tier: 'free', limit: 1 });
    expect(generate).not.toHaveBeenCalled();
  });

  it('gives the edition back when the model fails', async () => {
    generate.mockRejectedValue(new Error('upstream down'));
    const resp = await post();
    expect(resp.status).toBe(500);
    expect(rpc).toHaveBeenCalledWith('refund_print_design', expect.objectContaining({ p_user_id: 'u1' }));
    expect(inserted).not.toHaveBeenCalled();
  });
});

describe('GET /api/print-design/quota', () => {
  it('reports what is left today', async () => {
    const resp = await fetch(`${base}/api/print-design/quota`, { headers: { Authorization: 'Bearer jwt' } });
    expect(await resp.json()).toMatchObject({ tier: 'free', limit: 1, used: 1, remaining: 0 });
  });

  it('needs a signed-in member', async () => {
    const resp = await fetch(`${base}/api/print-design/quota`);
    expect(resp.status).toBe(401);
  });
});
