// Idempotent eval-fixture seeder: `npm run evals:seed`.
// Re-running always converges to the same state. Requires the service-role
// key (RLS bypass), so every destructive statement is scoped to the fixture
// UUIDs or the eval user's id, and trip ownership is verified before writes.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  MINIMAL_TRIP,
  PARIS_ACTIVITIES,
  PARIS_DAYS,
  PARIS_FLIGHT,
  PARIS_HOTEL,
  PARIS_OTHER_EXPENSE,
  PARIS_RESERVATIONS,
  PARIS_STAY_DAYS,
  PARIS_STAY_ID,
  PARIS_TRIP,
} from './trips';

const FIXTURE_TRIP_IDS = [PARIS_TRIP.trip_id, MINIMAL_TRIP.trip_id];

function fail(message: string): never {
  console.error(`[evals:seed] ${message}`);
  process.exit(1);
}

function must<T extends { error: { message: string } | null }>(label: string, res: T): T {
  if (res.error) fail(`${label}: ${res.error.message}`);
  return res;
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.EVAL_USER_EMAIL;
  const password = process.env.EVAL_USER_PASSWORD;
  if (!url || !anonKey || !serviceKey || !email || !password) {
    fail(
      'missing env — need VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ' +
        'SUPABASE_SERVICE_ROLE_KEY, EVAL_USER_EMAIL, EVAL_USER_PASSWORD',
    );
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  // 1. Ensure the eval user exists with the configured password.
  //    Cheapest existence probe is the password grant itself.
  let userId: string;
  const signIn = await anon.auth.signInWithPassword({ email, password });
  if (signIn.data.user) {
    userId = signIn.data.user.id;
    console.log(`[evals:seed] eval user exists: ${userId}`);
  } else {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.data.user) {
      userId = created.data.user.id;
      console.log(`[evals:seed] created eval user: ${userId}`);
    } else {
      // User exists but the password changed: find the id, reset the password.
      let found: string | null = null;
      for (let page = 1; page <= 20 && !found; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) fail(`listUsers: ${error.message}`);
        found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
        if (data.users.length < 200) break;
      }
      if (!found) {
        fail(
          `cannot sign in (${signIn.error?.message}), cannot create ` +
            `(${created.error?.message}), and user not found by listing`,
        );
      }
      userId = found;
      must('reset password', await admin.auth.admin.updateUserById(userId, { password }));
      console.log(`[evals:seed] reset password for existing eval user: ${userId}`);
    }
  }

  // 2. Ownership guard: fixture trip ids must be absent or owned by the eval user.
  const existing = must(
    'ownership check',
    await admin.from('trips').select('trip_id,user_id').in('trip_id', FIXTURE_TRIP_IDS),
  );
  for (const t of existing.data ?? []) {
    if (t.user_id !== userId) {
      fail(
        `trip ${t.trip_id} exists but is owned by ${t.user_id}, not the eval user — refusing to touch it`,
      );
    }
  }

  // 3. Upsert the two trips.
  must(
    'upsert trips',
    await admin.from('trips').upsert(
      [
        { ...PARIS_TRIP, user_id: userId },
        { ...MINIMAL_TRIP, user_id: userId },
      ],
      { onConflict: 'trip_id' },
    ),
  );

  // 4. Replace child rows: delete in FK-safe order, then insert fresh.
  must('delete stay-day links', await admin.from('accommodations_days').delete().eq('stay_id', PARIS_STAY_ID));
  for (const table of [
    'day_activities',
    'reservations',
    'accommodations',
    'transportation',
    'other_expenses',
    'trip_days',
  ] as const) {
    must(`delete ${table}`, await admin.from(table).delete().in('trip_id', FIXTURE_TRIP_IDS));
  }

  must('insert trip_days', await admin.from('trip_days').insert(PARIS_DAYS));
  must('insert accommodations', await admin.from('accommodations').insert([PARIS_HOTEL]));
  must('insert accommodations_days', await admin.from('accommodations_days').insert(PARIS_STAY_DAYS));
  must('insert transportation', await admin.from('transportation').insert([PARIS_FLIGHT]));
  must('insert day_activities', await admin.from('day_activities').insert(PARIS_ACTIVITIES));
  must('insert reservations', await admin.from('reservations').insert(PARIS_RESERVATIONS));
  must('insert other_expenses', await admin.from('other_expenses').insert([PARIS_OTHER_EXPENSE]));

  // 5. Prune eval-user chat rows so prod tables don't accumulate eval garbage.
  const threads = must(
    'list chat threads',
    await admin.from('ai_chat_threads').select('id').eq('user_id', userId),
  );
  const threadIds = (threads.data ?? []).map((t) => t.id);
  if (threadIds.length > 0) {
    must('delete chat messages', await admin.from('ai_chat_messages').delete().in('thread_id', threadIds));
    must('delete chat threads', await admin.from('ai_chat_threads').delete().eq('user_id', userId));
  }

  // 6. Reset usage so repeated runs never hit daily caps.
  must('reset ai usage', await admin.from('user_ai_usage').delete().eq('user_id', userId));

  console.log('[evals:seed] done — fixtures converged:');
  console.log(`  Paris trip:   ${PARIS_TRIP.trip_id}`);
  console.log(`  Minimal trip: ${MINIMAL_TRIP.trip_id}`);
  console.log(`  chat threads pruned: ${threadIds.length}`);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
