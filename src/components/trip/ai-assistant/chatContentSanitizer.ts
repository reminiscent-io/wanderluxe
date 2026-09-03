// Client-side display sanitizer for assistant chat content.
//
// The authoritative `create_items` parsing happens server-side in the ai-chat
// Edge Function (supabase/functions/ai-chat/createItems.ts): it strips the
// block from the saved message and emits its payload as an `extracted_items`
// SSE event. Like chatUrlSafety.ts, this module is a defense-in-depth layer
// for the rendering path only:
//
//   - while tokens stream in, the block (fenced or not) is hidden as it
//     arrives instead of flashing raw JSON at the user;
//   - historical messages persisted before the server-side recovery existed
//     (raw `create_items [...]` leaked into a bubble) render clean;
//   - a future server-side parse miss degrades to an invisible artifact
//     instead of a wall of JSON.
//
// Display-only: nothing here feeds the import flow, so hiding too eagerly
// while streaming costs a flicker at worst, never a lost item.

const FENCED_BLOCK_REGEX = /```create_items\s*[\s\S]*?```/g;
const OPEN_FENCE_REGEX = /```create_items[\s\S]*$/;
// Bare marker: `create_items` at the start or after whitespace / light
// punctuation, immediately followed by a JSON array or object. The prefix is
// a capture group rather than a lookbehind (older Safari lacks lookbehind and
// fails at script parse time), and a preceding backtick fails the class, so
// inline code like `create_items` is left alone.
const BARE_MARKER_REGEX = /(^|[\s:>*_-])create_items\s*(?=[[{])/;

// Longest suffix of `text` that could still grow into one of these markers —
// held back during streaming so the marker never flickers in.
const PARTIAL_MARKERS = ['```create_items', 'create_items'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Mirrors the server's strict bare-path validation: only JSON whose every
// entry is a {itemType: string, fields: object} counts as a create_items
// payload. Ordinary prose or unrelated JSON is never eaten.
function isCreateItemsPayload(jsonStr: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return false;
  }
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  if (arr.length === 0) return false;
  return arr.every(
    (it) => isRecord(it) && typeof it.itemType === 'string' && isRecord(it.fields)
  );
}

// Longest balanced JSON array/object at the start of `src`, or null when it
// never balances (same contract as the server's extractBalancedJson).
function extractBalancedJson(src: string): string | null {
  const first = src[0];
  if (first !== '[' && first !== '{') return null;
  const close = first === '[' ? ']' : '}';

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === first) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) return src.slice(0, i + 1);
    }
  }
  return null;
}

// Remove bare `create_items [...]` spans. During streaming, a marker whose
// JSON hasn't balanced yet truncates the text (it's still typing); in final
// content an unbalanced or wrong-shaped payload is left untouched.
function stripBareBlocks(content: string, streaming: boolean): string {
  let text = content;
  // Bounded loop: a response realistically carries one block; three covers
  // pathological repeats without risking a spin on adversarial input.
  for (let pass = 0; pass < 3; pass++) {
    const m = text.match(BARE_MARKER_REGEX);
    if (m === null || m.index === undefined) return text;
    const start = m.index + m[1].length;
    const jsonStart = m.index + m[0].length;
    const balanced = extractBalancedJson(text.slice(jsonStart));
    if (balanced && isCreateItemsPayload(balanced)) {
      text = text.slice(0, start) + text.slice(jsonStart + balanced.length);
      continue;
    }
    if (!balanced && streaming) {
      return text.slice(0, start);
    }
    return text;
  }
  return text;
}

// Trim a trailing fragment that could still become a create_items marker
// (streaming only): "```crea", a whitespace-preceded "create_i", or a fully
// typed bare "create_items" whose JSON hasn't arrived yet — all held back
// until the next chunk settles what they are.
function trimTrailingPartialMarker(text: string): string {
  // Whitespace can sit between a completed marker and its not-yet-arrived
  // JSON — look through it when matching.
  const trimmed = text.replace(/\s+$/, '');
  for (const marker of PARTIAL_MARKERS) {
    const maxLen = Math.min(marker.length, trimmed.length);
    for (let k = maxLen; k > 0; k--) {
      if (!trimmed.endsWith(marker.slice(0, k))) continue;
      const start = trimmed.length - k;
      // A bare-marker fragment only counts at the start of the text or after
      // the same prefix class the full marker requires.
      if (marker[0] !== '`' && start > 0 && !/[\s:>*_-]/.test(trimmed[start - 1])) continue;
      // Trim the cut edge so a held-back fragment never leaves a dangling
      // space at the end of the visible text.
      return trimmed.slice(0, start).trimEnd();
    }
  }
  return text;
}

export interface SanitizeOptions {
  /** True while the message is still streaming in. */
  streaming?: boolean;
}

/**
 * Strip create_items artifacts (fenced, open-fenced, or bare) from assistant
 * content before display. Never applied to user-authored messages.
 */
export function stripCreateItemsForDisplay(
  content: string,
  { streaming = false }: SanitizeOptions = {}
): string {
  if (!content || !content.includes('create_items')) {
    return streaming && content ? trimTrailingPartialMarker(content) : content;
  }

  let text = content.replace(FENCED_BLOCK_REGEX, '');
  // An opening fence with no close: mid-stream it's the block typing out; in
  // final content it's a truncated block — garbage either way, hide it.
  text = text.replace(OPEN_FENCE_REGEX, '');
  text = stripBareBlocks(text, streaming);
  if (streaming) text = trimTrailingPartialMarker(text);
  return text.trim();
}
