import { describe, expect, it } from 'vitest';
import { parseSSE } from './events';

describe('parseSSE', () => {
  it('returns complete data events and keeps the unfinished tail', () => {
    const { events, rest } = parseSSE('', 'data: {"type":"a"}\n\n: ping\n\ndata: {"type":"b"}\n\ndata: {"ty');
    expect(events).toEqual([{ type: 'a' }, { type: 'b' }]);
    expect(rest).toBe('data: {"ty');
    expect(parseSSE(rest, 'pe":"c"}\n\n').events).toEqual([{ type: 'c' }]);
  });
  it('skips keep-alive comments and malformed json', () => {
    expect(parseSSE('', ': ping\n\ndata: not json\n\n').events).toEqual([]);
  });
});
