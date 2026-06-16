import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { signInEvalUser } from '../helpers/auth';
import { missingEnv } from '../helpers/env';
import { connectMcp, toolJson } from '../helpers/mcpClient';
import { recordSuiteSkip, runCase } from '../helpers/runCase';
import {
  MINIMAL_TRIP_ID,
  PARIS_BUDGET,
  PARIS_TRIP,
  PARIS_TRIP_ID,
} from '../fixtures/trips';

const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'EVAL_USER_EMAIL', 'EVAL_USER_PASSWORD'];
const missing = missingEnv(REQUIRED);
recordSuiteSkip('mcp', missing);

describe.skipIf(missing.length > 0)('mcp tools', () => {
  let client: Client;

  beforeAll(async () => {
    const { token } = await signInEvalUser();
    client = await connectMcp(process.env.EVALS_BASE_URL!, token);
  });

  afterAll(async () => {
    await client?.close();
  });

  it('initialize: server identity and instructions', () =>
    runCase('mcp', 'initialize', async () => {
      expect(client.getServerVersion()?.name).toBe('wanderluxe');
      expect(client.getInstructions()).toContain('list_trips');
    }));

  it('tools/list: full read+write surface with correct annotations', () =>
    runCase('mcp', 'tools-list', async () => {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name).sort();

      const READ = ['get_trip', 'get_trip_budget', 'list_trips'];
      const WRITE = [
        'add_accommodation', 'add_activity', 'add_dining', 'add_expense', 'add_transportation',
        'create_trip',
        'delete_accommodation', 'delete_activity', 'delete_dining', 'delete_expense', 'delete_transportation',
        'update_accommodation', 'update_activity', 'update_dining', 'update_expense', 'update_transportation',
        'update_trip',
      ];
      expect(names).toEqual([...READ, ...WRITE].sort());

      const byName = new Map(tools.map((t) => [t.name, t]));
      for (const name of READ) {
        expect(byName.get(name)?.annotations?.readOnlyHint, `${name} readOnlyHint`).toBe(true);
      }
      for (const name of WRITE) {
        expect(byName.get(name)?.annotations?.readOnlyHint, `${name} readOnlyHint`).toBe(false);
      }
      // delete_* tools are destructive-hinted (update_trip is too, via its
      // cascade branch — but we only assert the delete_* tools here).
      const destructive = WRITE.filter((n) => n.startsWith('delete_'));
      for (const name of destructive) {
        expect(byName.get(name)?.annotations?.destructiveHint, `${name} destructiveHint`).toBe(true);
      }
    }));

  it('list_trips: includes both fixtures, sorted newest arrival first', () =>
    runCase('mcp', 'list-trips', async () => {
      const payload = toolJson(await client.callTool({ name: 'list_trips', arguments: {} }));
      const trips: Array<{ trip_id: string; destination: string; arrival_date: string; budget: number | null }> =
        payload.trips;
      const ids = trips.map((t) => t.trip_id);

      // NOTE: list_trips runs under RLS, which exposes public showcase trips
      // (is_public=true, owned by others) to every authenticated user — not
      // just owned/shared trips. So we assert the fixtures are present and the
      // documented sort contract holds, rather than an exact trip count (which
      // changes whenever the Explore showcase changes).
      expect(ids).toContain(MINIMAL_TRIP_ID);
      expect(ids).toContain(PARIS_TRIP_ID);

      // Whole list is sorted by arrival_date descending (the tool's contract).
      const arrivals = trips.map((t) => t.arrival_date);
      expect(arrivals).toEqual([...arrivals].sort((a, b) => b.localeCompare(a)));

      // Among the two fixtures, Lisbon (Nov) precedes Paris (Sep).
      const fixtureOrder = ids.filter((id) => id === MINIMAL_TRIP_ID || id === PARIS_TRIP_ID);
      expect(fixtureOrder).toEqual([MINIMAL_TRIP_ID, PARIS_TRIP_ID]);

      const paris = trips.find((t) => t.trip_id === PARIS_TRIP_ID)!;
      expect(paris.destination).toBe(PARIS_TRIP.destination);
      expect(paris.arrival_date).toBe(PARIS_TRIP.arrival_date);
      expect(paris.budget).toBe(PARIS_TRIP.budget);
    }));

  it('get_trip (Paris): itinerary nested correctly under days', () =>
    runCase('mcp', 'get-trip-paris', async () => {
      const payload = toolJson(
        await client.callTool({ name: 'get_trip', arguments: { trip_id: PARIS_TRIP_ID } }),
      );
      expect(payload.trip.destination).toBe('Paris, France');
      expect(payload.days).toHaveLength(3);
      expect(payload.days.map((d: { date: string }) => d.date)).toEqual([
        '2026-09-14', '2026-09-15', '2026-09-16',
      ]);

      const day1 = payload.days[0];
      expect(day1.activities.map((a: { title: string }) => a.title).sort()).toEqual(
        ['Louvre Museum guided tour', 'Seine river cruise'],
      );
      expect(day1.dining).toHaveLength(1);
      expect(day1.dining[0].restaurant_name).toBe('Le Cinq');
      expect(String(day1.dining[0].reservation_time)).toContain('19:30');
      expect(day1.dining[0].confirmation_number).toBe('LC-88421');

      const day2 = payload.days[1];
      expect(day2.activities.map((a: { title: string }) => a.title).sort()).toEqual(
        ['Eiffel Tower summit visit', "Musée d'Orsay visit"],
      );
      expect(day2.dining[0].restaurant_name).toBe('Septime');

      const day3 = payload.days[2];
      expect(day3.activities.map((a: { title: string }) => a.title)).toEqual(
        ['Palace of Versailles day trip'],
      );
      expect(day3.dining).toEqual([]);

      expect(payload.accommodations).toHaveLength(1);
      expect(payload.accommodations[0].hotel).toBe('Hôtel Le Meurice');
      expect(payload.accommodations[0].hotel_checkin_date).toBe('2026-09-14');

      expect(payload.transportation).toHaveLength(1);
      expect(payload.transportation[0].flight_number).toBe('AF007');
      expect(payload.transportation[0].provider).toBe('Air France');
    }));

  it('get_trip (minimal): empty itinerary arrays', () =>
    runCase('mcp', 'get-trip-minimal', async () => {
      const payload = toolJson(
        await client.callTool({ name: 'get_trip', arguments: { trip_id: MINIMAL_TRIP_ID } }),
      );
      expect(payload.trip.destination).toBe('Lisbon, Portugal');
      expect(payload.days).toEqual([]);
      expect(payload.accommodations).toEqual([]);
      expect(payload.transportation).toEqual([]);
    }));

  it('get_trip_budget (Paris): category totals match fixture constants', () =>
    runCase('mcp', 'budget-paris', async () => {
      const payload = toolJson(
        await client.callTool({ name: 'get_trip_budget', arguments: { trip_id: PARIS_TRIP_ID } }),
      );
      expect(payload.budget).toBe(PARIS_TRIP.budget);
      expect(payload.total_cost).toBe(PARIS_BUDGET.total_cost);
      expect(payload.total_paid).toBe(PARIS_BUDGET.total_paid);
      for (const cat of ['accommodations', 'transportation', 'activities', 'dining', 'other'] as const) {
        expect(payload.categories[cat].total, `${cat} total`).toBe(PARIS_BUDGET[cat].total);
        expect(payload.categories[cat].paid, `${cat} paid`).toBe(PARIS_BUDGET[cat].paid);
        expect(payload.categories[cat].currencies).toEqual(['EUR']);
      }
    }));
});
