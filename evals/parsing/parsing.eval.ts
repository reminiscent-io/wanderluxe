import { describe, expect, it } from 'vitest';
import { signInEvalUser } from '../helpers/auth';
import { missingEnv } from '../helpers/env';
import { EvalInfraError } from '../helpers/errors';
import { compareFields, type FieldRule } from '../helpers/fieldCompare';
import { recordSuiteSkip, runCase } from '../helpers/runCase';
import { withRetry } from '../helpers/retry';
import { textToPdf } from '../helpers/textToPdf';
import { flightConfirmation } from '../fixtures/docs/flightConfirmation';
import { hotelConfirmation } from '../fixtures/docs/hotelConfirmation';
import { restaurantConfirmation } from '../fixtures/docs/restaurantConfirmation';

const REQUIRED = [
  'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY',
  'EVAL_USER_EMAIL', 'EVAL_USER_PASSWORD', 'VITE_PARSE_TRAVEL_DOC_URL',
];
const missing = missingEnv(REQUIRED);
recordSuiteSkip('parsing', missing);

const PASS_THRESHOLD = 0.9;

type DocFixture = {
  name: string;
  itemType: string;
  text: string;
  golden: Record<string, unknown>;
  rules: Partial<Record<string, FieldRule>>;
};

async function parseDoc(doc: DocFixture): Promise<Record<string, unknown>> {
  const { token } = await signInEvalUser();
  const form = new FormData();
  form.append(
    'file',
    new Blob([textToPdf(doc.text)], { type: 'application/pdf' }),
    `${doc.name}.pdf`,
  );
  form.append('itemType', doc.itemType);

  const res = await fetch(process.env.VITE_PARSE_TRAVEL_DOC_URL!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.VITE_SUPABASE_ANON_KEY!,
    },
    body: form,
  });
  if (!res.ok) {
    throw new EvalInfraError(`parse-travel-doc HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const body = await res.json();
  if (!body || typeof body !== 'object' || !('fields' in body)) {
    throw new EvalInfraError(`unexpected parse response shape: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body.fields as Record<string, unknown>;
}

function runDocCase(doc: DocFixture) {
  it(`extracts ${doc.name} at >=${PASS_THRESHOLD * 100}% field accuracy`, () =>
    runCase('parsing', doc.name, async (meta) => {
      const fields = await withRetry(() => parseDoc(doc), 1, 2000);
      const { accuracy, fields: comparisons } = compareFields(doc.golden, fields, doc.rules);
      meta.fieldAccuracy = accuracy;
      const misses = comparisons.filter((c) => !c.match);
      meta.detail = misses.length
        ? 'missed: ' + misses.map((m) => `${m.field} (expected ${JSON.stringify(m.expected)}, got ${JSON.stringify(m.actual)})`).join('; ')
        : 'all fields matched';
      expect(accuracy, meta.detail).toBeGreaterThanOrEqual(PASS_THRESHOLD);
    }));
}

describe.skipIf(missing.length > 0)('document parsing', () => {
  runDocCase(hotelConfirmation);
  runDocCase(flightConfirmation);
  runDocCase(restaurantConfirmation);
});
