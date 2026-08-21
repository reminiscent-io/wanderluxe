import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { signInEvalUser } from '../helpers/auth';
import { missingEnv } from '../helpers/env';
import { connectMcp, toolJson } from '../helpers/mcpClient';
import { recordSuiteSkip, runCase } from '../helpers/runCase';

const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'EVAL_USER_EMAIL', 'EVAL_USER_PASSWORD'];
const missing = missingEnv(REQUIRED);
recordSuiteSkip('mcp', missing);

describe.skipIf(missing.length > 0)('mcp writes (lifecycle)', () => {
  let client: Client;
  let tripId: string;

  beforeAll(async () => {
    const { token } = await signInEvalUser();
    client = await connectMcp(process.env.EVALS_BASE_URL!, token);
  });

  afterAll(async () => {
    // NOTE: each run leaves its "Eval Sandbox City" trip in the eval user's
    // account — there is no whole-trip delete tool (out of scope for v1), so
    // these 2030-dated throwaway trips accumulate across runs.
    await client?.close();
  });

  it('create_trip returns trip_id and generated day_dates', () =>
    runCase('mcp', 'create-trip', async () => {
      const payload = toolJson(
        await client.callTool({
          name: 'create_trip',
          arguments: {
            destination: 'Eval Sandbox City',
            arrival_date: '2030-01-10',
            departure_date: '2030-01-12',
            budget: 1000,
          },
        }),
      );
      expect(payload.trip_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(payload.day_dates).toEqual(['2030-01-10', '2030-01-11', '2030-01-12']);
      tripId = payload.trip_id;
    }));

  it('add_activity and add_dining attach to a resolved day', () =>
    runCase('mcp', 'add-items', async () => {
      const activity = toolJson(
        await client.callTool({
          name: 'add_activity',
          arguments: { trip_id: tripId, date: '2030-01-10', title: 'Eval museum', cost: 20, currency: 'USD' },
        }),
      );
      expect(activity.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(activity.title).toBe('Eval museum');

      const dining = toolJson(
        await client.callTool({
          name: 'add_dining',
          arguments: { trip_id: tripId, date: '2030-01-10', restaurant_name: 'Eval Bistro', reservation_time: '19:30', end_time: '21:15' },
        }),
      );
      expect(dining.restaurant_name).toBe('Eval Bistro');
      expect(String(dining.end_time)).toContain('21:15');
    }));

  it('add_activity on an out-of-range date returns a clear error', () =>
    runCase('mcp', 'add-activity-out-of-range', async () => {
      const result = await client.callTool({
        name: 'add_activity',
        arguments: { trip_id: tripId, date: '2030-02-01', title: 'Should fail' },
      });
      expect((result as { isError?: boolean }).isError).toBe(true);
    }));

  it('update_trip blocks a destructive date shrink, then allows it with confirm_remove_days', () =>
    runCase('mcp', 'update-trip-confirm', async () => {
      // Day 2030-01-10 has an activity + dining → shrinking to exclude it must be blocked.
      const blocked = toolJson(
        await client.callTool({
          name: 'update_trip',
          arguments: { trip_id: tripId, arrival_date: '2030-01-11', departure_date: '2030-01-12' },
        }),
      );
      expect(blocked.status).toBe('confirmation_required');
      expect(blocked.at_risk_days.map((d: { date: string }) => d.date)).toContain('2030-01-10');

      const applied = toolJson(
        await client.callTool({
          name: 'update_trip',
          arguments: {
            trip_id: tripId,
            arrival_date: '2030-01-11',
            departure_date: '2030-01-12',
            confirm_remove_days: true,
          },
        }),
      );
      expect(applied.status).toBe('updated');
      expect(applied.days_removed).toContain('2030-01-10');
    }));

  it('get_trip reflects the writes (the removed day and its items are gone)', () =>
    runCase('mcp', 'verify-after-writes', async () => {
      const payload = toolJson(await client.callTool({ name: 'get_trip', arguments: { trip_id: tripId } }));
      expect(payload.days.map((d: { date: string }) => d.date)).toEqual(['2030-01-11', '2030-01-12']);
    }));
});
