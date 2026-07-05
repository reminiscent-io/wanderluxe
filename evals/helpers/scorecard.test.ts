// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { aggregateResults, formatSummaryTable, readResults, type CaseResult } from './scorecard';

const results: CaseResult[] = [
  { suite: 'mcp', case: 'tools-list', status: 'pass', latencyMs: 120 },
  { suite: 'mcp', case: 'rls', status: 'pass', latencyMs: 80 },
  { suite: 'chat', case: 'dinner-recs', status: 'pass', judgeScore: 4.5, latencyMs: 9000 },
  { suite: 'chat', case: 'off-topic', status: 'fail', judgeScore: 2, latencyMs: 7000 },
  { suite: 'chat', case: 'weather', status: 'error', detail: 'judge HTTP 500', latencyMs: 3000 },
  { suite: 'parsing', case: '*', status: 'skipped', detail: 'missing env: VITE_PARSE_TRAVEL_DOC_URL' },
];

describe('readResults', () => {
  it('parses JSONL, ignoring blank lines', () => {
    const jsonl = results.map((r) => JSON.stringify(r)).join('\n') + '\n\n';
    expect(readResults(jsonl)).toEqual(results);
  });

  it('returns empty for empty input', () => {
    expect(readResults('')).toEqual([]);
  });
});

describe('aggregateResults', () => {
  it('counts statuses per suite, preserving first-seen suite order', () => {
    expect(aggregateResults(results)).toEqual([
      { suite: 'mcp', pass: 2, fail: 0, error: 0, skipped: 0, total: 2 },
      { suite: 'chat', pass: 1, fail: 1, error: 1, skipped: 0, total: 3 },
      { suite: 'parsing', pass: 0, fail: 0, error: 0, skipped: 1, total: 1 },
    ]);
  });
});

describe('formatSummaryTable', () => {
  it('renders one aligned row per suite plus a header', () => {
    const table = formatSummaryTable(aggregateResults(results));
    const lines = table.split('\n');
    expect(lines[0]).toMatch(/suite\s+pass\s+fail\s+error\s+skipped\s+total/);
    expect(table).toMatch(/mcp\s+2\s+0\s+0\s+0\s+2/);
    expect(table).toMatch(/chat\s+1\s+1\s+1\s+0\s+3/);
  });
});
