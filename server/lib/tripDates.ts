// Pure date helpers for the MCP write tools. No I/O, no external deps, so they
// run in the main Vitest CI suite. All arithmetic is on UTC midnights, so DST
// transitions can never skip or duplicate a day.

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toUtcMidnight(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMidnight(ms: number): string {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Inclusive list of YYYY-MM-DD dates from start to end. Empty if start > end. */
export function dateRange(start: string, end: string): string[] {
  const startMs = toUtcMidnight(start);
  const endMs = toUtcMidnight(end);
  const out: string[] = [];
  for (let cur = startMs; cur <= endMs; cur += DAY_MS) {
    out.push(fromUtcMidnight(cur));
  }
  return out;
}

/** Diff existing trip-day dates against a target range. */
export function planDateChange(
  existing: string[],
  target: string[],
): { toAdd: string[]; toDrop: string[] } {
  const existingSet = new Set(existing);
  const targetSet = new Set(target);
  return {
    toAdd: target.filter((d) => !existingSet.has(d)),
    toDrop: existing.filter((d) => !targetSet.has(d)),
  };
}
