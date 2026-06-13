import { EvalInfraError } from './errors';
import { recordResult, type CaseResult } from './scorecard';

export type CaseMeta = Pick<CaseResult, 'judgeScore' | 'fieldAccuracy' | 'detail'>;

// Wraps one eval case body. The case mutates `meta` (judgeScore etc.) BEFORE
// asserting, so scores are recorded even when the assertion then fails —
// that's what makes judge-score drift visible across runs.
export async function runCase(
  suite: string,
  name: string,
  fn: (meta: CaseMeta) => Promise<void>,
): Promise<void> {
  const meta: CaseMeta = {};
  const start = Date.now();
  try {
    await fn(meta);
    recordResult({ suite, case: name, status: 'pass', latencyMs: Date.now() - start, ...meta });
  } catch (err) {
    const status = err instanceof EvalInfraError ? 'error' : 'fail';
    const detail = meta.detail ?? (err instanceof Error ? err.message : String(err));
    recordResult({ suite, case: name, status, latencyMs: Date.now() - start, ...meta, detail });
    throw err; // vitest still reports the case red
  }
}

// Call at module top-level of a suite file when env is missing: records the
// skip (describe.skipIf means nothing inside the suite ever executes).
export function recordSuiteSkip(suite: string, missing: string[]): void {
  if (missing.length === 0) return;
  const detail = `missing env: ${missing.join(', ')}`;
  console.warn(`[evals] skipping ${suite} suite — ${detail}`);
  recordResult({ suite, case: '*', status: 'skipped', detail });
}
