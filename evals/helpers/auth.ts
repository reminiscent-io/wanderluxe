import { createClient } from '@supabase/supabase-js';
import { EvalInfraError } from './errors';

let cached: { token: string; userId: string } | null = null;

// Password-grant sign-in for the eval user. Memoized per process — the eval
// config runs everything in a single fork, so this is once per run.
export async function signInEvalUser(): Promise<{ token: string; userId: string }> {
  if (cached) return cached;
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const email = process.env.EVAL_USER_EMAIL;
  const password = process.env.EVAL_USER_PASSWORD;
  if (!url || !anonKey || !email || !password) {
    throw new EvalInfraError(
      'eval auth env missing (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, EVAL_USER_EMAIL, EVAL_USER_PASSWORD)',
    );
  }
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new EvalInfraError(
      `eval user sign-in failed: ${error?.message ?? 'no session'} — run \`npm run evals:seed\` first`,
    );
  }
  cached = { token: data.session.access_token, userId: data.session.user.id };
  return cached;
}
