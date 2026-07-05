import { EvalInfraError } from './errors';

export type SSEEvent = { event: string; data: string };

// Shape emitted by the ai-chat Edge Function's place_cards event (subset we assert on).
export type EvalPlaceCard = {
  place_id: string;
  name: string;
  address: string;
  maps_url: string;
  website?: string;
  booking_url?: string;
  [key: string]: unknown;
};

export type ChatResult = {
  text: string;
  placeCards: EvalPlaceCard[];
  links: Array<{ text: string; url: string }>;
  events: SSEEvent[];
  done: boolean;
  error: { code?: string; message?: string } | null;
};

// Parses a complete SSE body (we read the stream to the end before parsing —
// evals only need the final transcript, not incremental rendering).
export function parseSSEStream(raw: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  for (const block of raw.split('\n\n')) {
    if (!block.trim()) continue;
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice('event:'.length).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trimStart());
      // lines starting with ":" are SSE comments/keepalives — ignored
    }
    if (dataLines.length > 0) events.push({ event, data: dataLines.join('\n') });
  }
  return events;
}

export function extractMarkdownLinks(text: string): Array<{ text: string; url: string }> {
  return [...text.matchAll(/\[([^\]\n]+)\]\(([^)\s]+)\)/g)].map((m) => ({
    text: m[1],
    url: m[2],
  }));
}

export function assembleChatResult(events: SSEEvent[]): ChatResult {
  let text = '';
  let placeCards: EvalPlaceCard[] = [];
  let done = false;
  let error: ChatResult['error'] = null;

  for (const e of events) {
    if (e.event === 'message') {
      try {
        text += JSON.parse(e.data).content ?? '';
      } catch {
        // non-JSON message data — ignore (defensive; should not happen)
      }
    } else if (e.event === 'place_cards') {
      try {
        const parsed = JSON.parse(e.data);
        placeCards = Array.isArray(parsed) ? parsed : (parsed?.cards ?? []);
      } catch {
        // malformed place_cards payload: leave empty; deterministic
        // assertions on placeCards will fail loudly if cards were expected
      }
    } else if (e.event === 'done') {
      done = true;
    } else if (e.event === 'error') {
      try {
        error = JSON.parse(e.data);
      } catch {
        error = { message: e.data };
      }
    }
  }

  return { text, placeCards, links: extractMarkdownLinks(text), events, done, error };
}

export async function sendChatMessage(opts: {
  baseUrl: string;
  tripId: string;
  token: string;
  message: string;
}): Promise<ChatResult> {
  const res = await fetch(`${opts.baseUrl}/api/trips/${opts.tripId}/assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.token}`,
    },
    body: JSON.stringify({ message: opts.message }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new EvalInfraError(`chat endpoint HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const raw = await res.text();
  return assembleChatResult(parseSSEStream(raw));
}
