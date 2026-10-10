// A browser EventSource cannot send an Authorization header, so the live stream is read with fetch instead.

/** Splits streamed text into complete `data:` events; returns the unfinished tail to prepend to the next chunk. */
export function parseSSE(buffer, chunk) {
  const parts = (buffer + chunk).split('\n\n');
  const rest = parts.pop();
  const events = [];
  for (const part of parts) {
    const data = part.split('\n').filter((l) => l.startsWith('data: ')).map((l) => l.slice(6)).join('\n');
    if (!data) continue;
    try { events.push(JSON.parse(data)); } catch { /* ignore a malformed event */ }
  }
  return { events, rest };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Keeps a stream open, reconnecting with a growing delay. `open(signal)` returns the fetch Response.
 * onStatus gets 'live', 'reconnecting' or 'unauthorized'. Returns a function that stops it.
 */
export function connect({ open, onEvent, onStatus }) {
  const ctrl = new AbortController();
  (async () => {
    let delay = 1000;
    while (!ctrl.signal.aborted) {
      try {
        const res = await open(ctrl.signal);
        if (res.status === 401) { onStatus('unauthorized'); return; }
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
        onStatus('live');
        delay = 1000;
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let rest = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const parsed = parseSSE(rest, dec.decode(value, { stream: true }));
          rest = parsed.rest;
          parsed.events.forEach(onEvent);
        }
      } catch {
        if (ctrl.signal.aborted) return;
      }
      if (ctrl.signal.aborted) return;
      onStatus('reconnecting');
      await sleep(delay);
      delay = Math.min(delay * 2, 10000);
    }
  })();
  return () => ctrl.abort();
}
