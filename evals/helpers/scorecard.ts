import { appendFileSync } from 'node:fs';

export type CaseStatus = 'pass' | 'fail' | 'error' | 'skipped';

export type CaseResult = {
  suite: string;
  case: string;
  status: CaseStatus;
  judgeScore?: number;
  fieldAccuracy?: number;
  latencyMs?: number;
  detail?: string;
};

// Appends one result line to the run's JSONL file. Workers and the globalSetup
// process only share the filesystem, so this is the accumulation channel.
// No-ops outside an eval run (e.g. when helpers are imported by CI unit tests).
export function recordResult(result: CaseResult): void {
  const file = process.env.EVALS_RUN_JSONL;
  if (!file) return;
  appendFileSync(file, JSON.stringify(result) + '\n');
}

export function readResults(jsonl: string): CaseResult[] {
  return jsonl
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as CaseResult);
}

export type SuiteSummary = {
  suite: string;
  pass: number;
  fail: number;
  error: number;
  skipped: number;
  total: number;
};

export function aggregateResults(results: CaseResult[]): SuiteSummary[] {
  const bySuite = new Map<string, SuiteSummary>();
  for (const r of results) {
    let summary = bySuite.get(r.suite);
    if (!summary) {
      summary = { suite: r.suite, pass: 0, fail: 0, error: 0, skipped: 0, total: 0 };
      bySuite.set(r.suite, summary);
    }
    summary[r.status] += 1;
    summary.total += 1;
  }
  return [...bySuite.values()];
}

export function formatSummaryTable(summaries: SuiteSummary[]): string {
  const header = ['suite', 'pass', 'fail', 'error', 'skipped', 'total'];
  const rows = summaries.map((s) => [
    s.suite,
    String(s.pass),
    String(s.fail),
    String(s.error),
    String(s.skipped),
    String(s.total),
  ]);
  const widths = header.map((h, col) =>
    Math.max(h.length, ...rows.map((r) => r[col].length)),
  );
  const renderRow = (cells: string[]) =>
    cells.map((c, col) => c.padEnd(widths[col] + 2)).join('').trimEnd();
  return [renderRow(header), ...rows.map(renderRow)].join('\n');
}
