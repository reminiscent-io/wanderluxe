// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { extractMarkdownLinks, parseSSEStream, assembleChatResult } from './chatClient';

const RAW_STREAM = [
  'event: message\ndata: {"content":"Try "}',
  'event: message\ndata: {"content":"[Septime](https://resy.com/r/septime) tonight."}',
  'event: place_cards\ndata: [{"place_id":"p1","name":"Septime","address":"80 Rue de Charonne","maps_url":"https://maps.google.com/?cid=1"}]',
  'event: done\ndata: {"thread_id":"t1","message_id":"m1"}',
].join('\n\n') + '\n\n';

describe('parseSSEStream', () => {
  it('splits a raw SSE body into named events with data payloads', () => {
    const events = parseSSEStream(RAW_STREAM);
    expect(events.map((e) => e.event)).toEqual(['message', 'message', 'place_cards', 'done']);
    expect(JSON.parse(events[0].data)).toEqual({ content: 'Try ' });
  });

  it('defaults the event name to "message" when no event line is present', () => {
    const events = parseSSEStream('data: {"content":"hi"}\n\n');
    expect(events).toEqual([{ event: 'message', data: '{"content":"hi"}' }]);
  });

  it('joins multi-line data fields with newlines', () => {
    const events = parseSSEStream('event: message\ndata: line1\ndata: line2\n\n');
    expect(events[0].data).toBe('line1\nline2');
  });

  it('ignores blank blocks and comment-only blocks', () => {
    expect(parseSSEStream('\n\n: keepalive\n\n')).toEqual([]);
  });
});

describe('assembleChatResult', () => {
  it('accumulates text, parses place cards, flags done', () => {
    const result = assembleChatResult(parseSSEStream(RAW_STREAM));
    expect(result.text).toBe('Try [Septime](https://resy.com/r/septime) tonight.');
    expect(result.placeCards).toHaveLength(1);
    expect(result.placeCards[0].name).toBe('Septime');
    expect(result.done).toBe(true);
    expect(result.error).toBeNull();
    expect(result.links).toEqual([{ text: 'Septime', url: 'https://resy.com/r/septime' }]);
  });

  it('captures error events', () => {
    const result = assembleChatResult(
      parseSSEStream('event: error\ndata: {"code":"INTERNAL_ERROR","message":"boom"}\n\n'),
    );
    expect(result.error).toEqual({ code: 'INTERNAL_ERROR', message: 'boom' });
    expect(result.done).toBe(false);
  });

  it('accepts a {cards: [...]} wrapper for place_cards payloads', () => {
    const result = assembleChatResult(
      parseSSEStream('event: place_cards\ndata: {"cards":[{"place_id":"p2","name":"X","address":"Y","maps_url":"Z"}]}\n\n'),
    );
    expect(result.placeCards).toHaveLength(1);
  });
});

describe('extractMarkdownLinks', () => {
  it('finds all markdown links', () => {
    expect(
      extractMarkdownLinks('See [A](https://a.example/1) and [B](https://b.example/2).'),
    ).toEqual([
      { text: 'A', url: 'https://a.example/1' },
      { text: 'B', url: 'https://b.example/2' },
    ]);
  });

  it('returns empty for text without links', () => {
    expect(extractMarkdownLinks('no links here')).toEqual([]);
  });
});
