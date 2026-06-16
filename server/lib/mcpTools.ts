import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { summarizeCosts } from './budgetSummary';
import { createTrip, updateTrip, WriteError } from './tripWrites';
import type { UserContext } from './tripWrites';

export function toolResult(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

export function toolError(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false };
const WRITE_IDEMPOTENT = { readOnlyHint: false, destructiveHint: false, idempotentHint: true };
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true };
const DESTRUCTIVE_IDEMPOTENT = { readOnlyHint: false, destructiveHint: true, idempotentHint: true };

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use an ISO date, YYYY-MM-DD')
  .refine((s) => {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, 'Not a valid calendar date');
const timeField = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Use a 24h time, HH:MM');
const currencyField = z
  .string()
  .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code, e.g. EUR');

/**
 * Register every WanderLuxe tool on the given server. `supabase` is the
 * per-request user-scoped client; `ctx` is the authenticated user identity
 * (used by create_trip / owner-share — never trusted from tool input).
 */
export function registerWanderluxeTools(
  server: McpServer,
  supabase: SupabaseClient,
  ctx: UserContext,
): void {
  registerReadTools(server, supabase);
  registerWriteTools(server, supabase, ctx);
}

function registerReadTools(server: McpServer, supabase: SupabaseClient): void {
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
        note: "Amounts are in each item's own currency; check `currencies` per category before summing across categories.",
      });
    },
  );
}

function registerWriteTools(
  server: McpServer,
  supabase: SupabaseClient,
  ctx: UserContext,
): void {
  server.registerTool(
    'create_trip',
    {
      description:
        'Create a new trip. Generates one day per date from arrival to departure (inclusive) and returns the new trip_id plus the generated day_dates, so you can add items right away without a separate read.',
      inputSchema: {
        destination: z.string().min(1).describe('Trip name / destination, e.g. "Paris, France"'),
        arrival_date: dateField.describe('First day of the trip (YYYY-MM-DD)'),
        departure_date: dateField.describe('Last day of the trip (YYYY-MM-DD)'),
        budget: z.number().positive().optional().describe('Total trip budget (optional)'),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        if (args.departure_date < args.arrival_date) {
          return toolError('departure_date must be on or after arrival_date.');
        }
        const result = await createTrip(supabase, ctx, {
          destination: args.destination,
          arrival_date: args.arrival_date,
          departure_date: args.departure_date,
          budget: args.budget ?? null,
        });
        return toolResult(result);
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to create trip: ${String(err)}`);
      }
    },
  );

  server.registerTool(
    'update_trip',
    {
      description:
        "Update a trip's destination, budget, or dates. Changing dates adds new days automatically. If shrinking the range would drop days that still have items, the tool returns status 'confirmation_required' with the at-risk days and changes nothing; re-call with confirm_remove_days: true to delete those days and their items.",
      inputSchema: {
        trip_id: z.string().uuid().describe('Trip ID from list_trips'),
        destination: z.string().min(1).optional(),
        budget: z.number().positive().nullable().optional().describe('Set to null to clear the budget'),
        arrival_date: dateField.optional(),
        departure_date: dateField.optional(),
        confirm_remove_days: z
          .boolean()
          .optional()
          .describe('Set true to confirm deleting days (and their items) that fall outside the new range'),
      },
      annotations: DESTRUCTIVE_IDEMPOTENT,
    },
    async (args) => {
      try {
        const result = await updateTrip(supabase, args);
        return toolResult(result);
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to update trip: ${String(err)}`);
      }
    },
  );
}
