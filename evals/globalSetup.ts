// Vitest globalSetup for eval runs: starts the Express server from the
// working tree (port 8090) unless EVALS_SERVER_URL points at one, prepares
// the results JSONL, and on teardown writes the timestamped results JSON and
// prints the per-suite summary table.
import 'dotenv/config';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aggregateResults, formatSummaryTable, readResults } from './helpers/scorecard';

const evalsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(evalsDir, '..');
const resultsDir = path.join(evalsDir, 'results');
const runJsonl = path.join(resultsDir, 'current-run.jsonl');

const EVALS_PORT = 8090;
const HEALTH_TIMEOUT_MS = 30_000;

async function waitForHealth(url: string, child: ChildProcessWithoutNullStreams | null): Promise<void> {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  let lastError = '';
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) break; // process already died
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastError = `health returned ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  child?.kill('SIGTERM');
  throw new Error(
    `[evals] Express server failed to become healthy at ${url} within ${HEALTH_TIMEOUT_MS / 1000}s ` +
      `(${lastError}). Check that .env has VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / ` +
      `SUPABASE_SERVICE_ROLE_KEY, or set EVALS_SERVER_URL to a running server.`,
  );
}

export default async function globalSetup() {
  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(runJsonl, '');
  process.env.EVALS_RUN_JSONL = runJsonl;
  const startedAt = new Date();

  let child: ChildProcessWithoutNullStreams | null = null;
  let baseUrl = process.env.EVALS_SERVER_URL;

  if (baseUrl) {
    console.log(`[evals] using external server: ${baseUrl}`);
  } else {
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
      throw new Error(
        '[evals] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — cannot spawn the local server. ' +
          'Fill .env or set EVALS_SERVER_URL.',
      );
    }
    baseUrl = `http://localhost:${EVALS_PORT}`;
    console.log(`[evals] spawning Express server on port ${EVALS_PORT}…`);
    child = spawn('npx', ['tsx', 'server/index.ts'], {
      cwd: repoRoot,
      env: { ...process.env, PORT: String(EVALS_PORT), NODE_ENV: 'development' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let serverLog = '';
    child.stdout.on('data', (d: Buffer) => { serverLog += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { serverLog += d.toString(); });
    try {
      await waitForHealth(`${baseUrl}/api/ai-chat/health`, child);
    } catch (err) {
      console.error('[evals] server output:\n' + serverLog.slice(-3000));
      throw err;
    }
    console.log('[evals] server healthy');
  }

  process.env.EVALS_BASE_URL = baseUrl;

  return async function globalTeardown() {
    if (child) {
      child.kill('SIGTERM');
      // give tsx a moment to exit cleanly; force-kill stragglers
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (child.exitCode === null) child.kill('SIGKILL');
    }

    const results = readResults(readFileSync(runJsonl, 'utf8'));
    if (results.length === 0) {
      console.log('[evals] no results recorded');
      return;
    }
    const stamp = startedAt.toISOString().replace(/:/g, '-');
    const outFile = path.join(resultsDir, `${stamp}.json`);
    writeFileSync(outFile, JSON.stringify({ startedAt: startedAt.toISOString(), results }, null, 2));

    console.log('\n[evals] summary\n');
    console.log(formatSummaryTable(aggregateResults(results)));
    const failures = results.filter((r) => r.status === 'fail' || r.status === 'error');
    for (const f of failures) {
      console.log(`  ${f.status.toUpperCase()} ${f.suite}/${f.case}: ${f.detail ?? ''}`);
    }
    console.log(`\n[evals] results written to ${outFile}`);
  };
}
