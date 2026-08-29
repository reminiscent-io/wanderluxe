// Pure helpers for parsing the model's `create_items` block out of its chat
// response. Kept free of Deno globals so vitest can import this module
// directly from the src/ test suite.
//
// The canonical format (what the system prompt asks for) is a fenced block:
//
//   ```create_items
//   [{"itemType": "reservation", "fields": {...}}]
//   ```
//
// Recovery paths, tried in order:
//   1. Closed fence — the canonical form.
//   2. Open fence with balanced JSON — the model hit maxOutputTokens before
//      it could emit the closing fence.
//   3. Bare marker with balanced JSON — the model dropped the fences entirely
//      and emitted `create_items [{...}]` as plain prose (observed model
//      drift in production; the raw JSON leaked into the chat bubble and the
//      item was never staged for import). This path is stricter than the
//      fenced ones: the JSON must parse AND every entry must look like a
//      create-item ({itemType: string, fields: object}), so ordinary prose
//      that merely mentions create_items is never eaten.

import { extractBalancedJson } from './placeCards.ts';

export type ExtractedItem = {
  id: string;
  itemType: string;
  fields: Record<string, unknown>;
  missingRequired: string[];
  confidence: number;
  status: 'pending';
};

const CREATE_ITEMS_CLOSED_REGEX = /```create_items\s*([\s\S]*?)```/;
const CREATE_ITEMS_OPEN_REGEX = /```create_items\s*([\s\S]*)$/;
// Bare marker: `create_items` at the start of the response or after
// whitespace / light punctuation, immediately followed by a JSON array or
// object. The prefix is a capture group (not a lookbehind, which old Safari
// chokes on if this pattern gets mirrored client-side) and is added back via
// index math. A preceding backtick fails the prefix class, so inline code
// like `create_items` is naturally excluded.
const CREATE_ITEMS_BARE_REGEX = /(^|[\s:>*_-])create_items\s*(?=[[{])/;

const REQUIRED_BY_TYPE: Record<string, string[]> = {
  accommodation: ['name', 'check_in_date', 'check_out_date'],
  transportation: ['type', 'departure_location', 'arrival_location', 'departure_date'],
  activity: ['name', 'date'],
  reservation: ['restaurant_name', 'date', 'time'],
};

type RawItem = { itemType?: string; fields?: Record<string, unknown> } & Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toExtractedItems(rawItems: RawItem[]): ExtractedItem[] {
  return rawItems.map((item, idx) => {
    const itemType = item.itemType || 'activity';
    const fields = item.fields || item;
    const required = REQUIRED_BY_TYPE[itemType] || [];
    const missingRequired = required.filter((k: string) => !fields[k]);
    return {
      id: `ai-item-${idx}-${Date.now()}`,
      itemType,
      fields,
      missingRequired,
      confidence: 0.85,
      status: 'pending' as const,
    };
  });
}

// Parse used only by the bare-marker path: every entry must be a
// {itemType, fields} object. The fenced paths stay lenient — there the fence
// itself is the signal; without fences the shape is the signal.
export function parseStrictItems(jsonStr: string): RawItem[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return null;
  }
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  if (arr.length === 0) return null;
  const wellFormed = arr.every(
    (it) => isRecord(it) && typeof it.itemType === 'string' && isRecord(it.fields)
  );
  return wellFormed ? (arr as RawItem[]) : null;
}

// Locate a bare (unfenced) create_items block: the span to strip from the
// response and its balanced JSON payload. Returns null when no marker is
// found or the JSON never balances.
export function findBareCreateItems(
  response: string
): { start: number; end: number; jsonStr: string } | null {
  const m = response.match(CREATE_ITEMS_BARE_REGEX);
  if (m === null || m.index === undefined) return null;
  const start = m.index + m[1].length;
  // The lookahead guarantees the char after m[0] is `[` or `{`.
  const jsonStart = m.index + m[0].length;
  const balanced = extractBalancedJson(response.slice(jsonStart));
  if (!balanced) return null;
  return { start, end: jsonStart + balanced.length, jsonStr: balanced };
}

// True when the response contains anything that looks like a create_items
// marker (fenced or bare). Used for telemetry when extraction comes up empty.
export function hasCreateItemsMarker(text: string): boolean {
  return text.includes('```create_items') || CREATE_ITEMS_BARE_REGEX.test(text);
}

export function parseCreateItemsBlock(response: string): {
  cleanContent: string;
  extractedItems: ExtractedItem[];
} {
  let jsonStr: string | null = null;
  let stripStart = -1;
  let stripEnd = -1;
  let strictShape = false;

  const closedMatch = response.match(CREATE_ITEMS_CLOSED_REGEX);
  if (closedMatch && closedMatch.index !== undefined) {
    jsonStr = closedMatch[1].trim();
    stripStart = closedMatch.index;
    stripEnd = closedMatch.index + closedMatch[0].length;
  } else {
    const openMatch = response.match(CREATE_ITEMS_OPEN_REGEX);
    if (openMatch && openMatch.index !== undefined) {
      const balanced = extractBalancedJson(openMatch[1]);
      if (balanced) {
        jsonStr = balanced;
        // A truncated open fence is never useful prose — strip to the end.
        stripStart = openMatch.index;
        stripEnd = response.length;
      }
    } else {
      const bare = findBareCreateItems(response);
      if (bare) {
        jsonStr = bare.jsonStr;
        stripStart = bare.start;
        stripEnd = bare.end;
        strictShape = true;
      }
    }
  }

  if (jsonStr === null || stripStart < 0) {
    return { cleanContent: response, extractedItems: [] };
  }

  let rawItems: RawItem[] = [];
  if (strictShape) {
    const strict = parseStrictItems(jsonStr);
    // Bare match with the wrong shape: it wasn't a create_items block after
    // all — leave the response untouched.
    if (!strict) return { cleanContent: response, extractedItems: [] };
    rawItems = strict;
  } else {
    try {
      const parsed = JSON.parse(jsonStr);
      rawItems = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error('Failed to parse create_items JSON:', e, 'raw:', jsonStr.slice(0, 500));
    }
  }

  const cleanContent = (response.slice(0, stripStart) + response.slice(stripEnd)).trim();
  return { cleanContent, extractedItems: toExtractedItems(rawItems) };
}
