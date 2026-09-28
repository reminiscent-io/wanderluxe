import { describe, expect, it } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { timezoneField, GET_TRIP_SELECT, registerWanderluxeTools } from './mcpTools';

interface RegisteredTool {
  config: { title?: string; annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean } };
  handler: (args: Record<string, unknown>) => Promise<{ isError?: boolean }>;
}

interface Call {
  table: string;
  method: string;
  args: unknown[];
}

/**
 * Chainable Supabase stand-in: every builder method returns the builder, and
 * awaiting it resolves to an empty success. `single()` hands back a trip row so
 * create_trip can run end to end. Every call is recorded.
 */
function fakeSupabase() {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const builder: Record<string, unknown> = {};
      const result = { data: [], error: null };
      for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'in']) {
        builder[method] = (...args: unknown[]) => {
          calls.push({ table, method, args });
          return builder;
        };
      }
      builder.maybeSingle = () => Promise.resolve({ data: null, error: null });
      builder.single = () => Promise.resolve({ data: { trip_id: 'trip-1' }, error: null });
      builder.then = (resolve: (v: typeof result) => unknown) => resolve(result);
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

function registerAll(supabase: SupabaseClient = fakeSupabase().client) {
  const tools = new Map<string, RegisteredTool>();
  const server = {
    registerTool(name: string, config: RegisteredTool['config'], handler: RegisteredTool['handler']) {
      tools.set(name, { config, handler });
    },
  };
  registerWanderluxeTools(server as unknown as McpServer, supabase, { userId: 'user-1', email: null });
  return tools;
}

describe('tool registry', () => {
  it('registers the 20 documented tools', () => {
    expect(registerAll().size).toBe(20);
  });

  // The Claude Connectors Directory rejects tools without a title and a
  // readOnlyHint or destructiveHint.
  it('gives every tool a title and explicit safety hints', () => {
    for (const [name, { config }] of registerAll()) {
      expect(config.title, name).toMatch(/\S/);
      expect(typeof config.annotations?.readOnlyHint, name).toBe('boolean');
      expect(typeof config.annotations?.destructiveHint, name).toBe('boolean');
    }
  });

  it('marks only list/get tools read-only, and every delete destructive', () => {
    for (const [name, { config }] of registerAll()) {
      const readOnly = name.startsWith('list_') || name.startsWith('get_');
      expect(config.annotations?.readOnlyHint, name).toBe(readOnly);
      if (name.startsWith('delete_')) expect(config.annotations?.destructiveHint, name).toBe(true);
    }
  });
});

describe('create_trip', () => {
  it('stores the timezone it was given', async () => {
    const { client, calls } = fakeSupabase();
    const result = await registerAll(client).get('create_trip')!.handler({
      destination: 'Tokyo, Japan',
      arrival_date: '2026-10-01',
      departure_date: '2026-10-03',
      timezone: 'Asia/Tokyo',
    });
    expect(result.isError).toBeUndefined();
    const tripInsert = calls.find((c) => c.table === 'trips' && c.method === 'insert');
    expect(tripInsert?.args[0]).toMatchObject({ timezone: 'Asia/Tokyo' });
  });
});

describe('get_trip_budget', () => {
  it('returns expense ids, which update_expense and delete_expense need', async () => {
    const { client, calls } = fakeSupabase();
    await registerAll(client).get('get_trip_budget')!.handler({ trip_id: 'trip-1' });
    const select = calls.find((c) => c.table === 'other_expenses' && c.method === 'select');
    expect(String(select?.args[0]).split(',')).toContain('id');
  });
});

describe('timezoneField', () => {
  it('accepts real IANA zone ids', () => {
    expect(timezoneField.safeParse('Europe/Paris').success).toBe(true);
    expect(timezoneField.safeParse('Asia/Tokyo').success).toBe(true);
  });

  it('rejects strings Intl cannot resolve as a zone', () => {
    expect(timezoneField.safeParse('Paris').success).toBe(false);
    expect(timezoneField.safeParse('Not/AZone').success).toBe(false);
    expect(timezoneField.safeParse('').success).toBe(false);
  });
});

describe('GET_TRIP_SELECT', () => {
  it('exposes timezone metadata on the trip and every timed entity', () => {
    expect(GET_TRIP_SELECT.trip.split(',')).toContain('timezone');
    expect(GET_TRIP_SELECT.activities.split(',')).toContain('timezone');
    expect(GET_TRIP_SELECT.dining.split(',')).toContain('timezone');
    expect(GET_TRIP_SELECT.accommodations.split(',')).toContain('timezone');
    expect(GET_TRIP_SELECT.transportation.split(',')).toContain('departure_timezone');
    expect(GET_TRIP_SELECT.transportation.split(',')).toContain('arrival_timezone');
  });

  it('reads the reservation end time back on get_trip', () => {
    // An explicit column list drops a new field silently — no type error, no
    // runtime error, just missing data.
    expect(GET_TRIP_SELECT.dining.split(',')).toContain('end_time');
  });
});
