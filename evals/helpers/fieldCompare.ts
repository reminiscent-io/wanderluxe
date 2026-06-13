export type FieldRule = 'exact' | 'fuzzy';

// Lowercase, fold accents (NFD strip of combining marks), replace every
// non-alphanumeric run with a single space.
export function normalizeLoose(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function fieldMatches(expected: unknown, actual: unknown, rule: FieldRule): boolean {
  if (expected === null) {
    return actual === null || actual === undefined || actual === '';
  }
  if (rule === 'exact' || typeof expected !== 'string') {
    return String(actual ?? '') === String(expected);
  }
  const e = normalizeLoose(expected);
  const a = normalizeLoose(String(actual ?? ''));
  if (!e || !a) return e === a;
  return a === e || a.includes(e) || e.includes(a);
}

export type FieldComparison = {
  field: string;
  expected: unknown;
  actual: unknown;
  rule: FieldRule;
  match: boolean;
};

export type CompareResult = { accuracy: number; fields: FieldComparison[] };

// Compares every key of `expected` against `actual` (extraction output).
// `rules` lists fuzzy fields; everything else is exact.
export function compareFields(
  expected: Record<string, unknown>,
  actual: Record<string, unknown> | null | undefined,
  rules: Partial<Record<string, FieldRule>>,
): CompareResult {
  const fields = Object.entries(expected).map(([field, exp]) => {
    const rule: FieldRule = rules[field] ?? 'exact';
    const act = actual ? actual[field] : undefined;
    return { field, expected: exp, actual: act, rule, match: fieldMatches(exp, act, rule) };
  });
  const accuracy = fields.length
    ? fields.filter((f) => f.match).length / fields.length
    : 1;
  return { accuracy, fields };
}
