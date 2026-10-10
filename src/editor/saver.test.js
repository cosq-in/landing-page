import { describe, expect, it, vi } from 'vitest';
import { Saver } from './saver';

const tick = () => new Promise((r) => setTimeout(r, 0));
const setup = (send) => {
  const log = { saved: [], conflicts: [] };
  const saver = new Saver({ send, interval: 10, onSaved: (k, s) => log.saved.push([k, s]), onConflict: (k, c) => log.conflicts.push([k, c]) });
  return { saver, log };
};

describe('Saver', () => {
  it('coalesces rapid edits into one save of the latest value', async () => {
    const send = vi.fn(async (k, v, base) => ({ saved: { ...v, version: base + 1 } }));
    const { saver, log } = setup(send);
    saver.edit('a', { n: 1 });
    saver.edit('a', { n: 2 });
    saver.edit('a', { n: 3 });
    await new Promise((r) => setTimeout(r, 40));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('a', { n: 3 }, 0);
    expect(log.saved[0][1].version).toBe(1);
  });

  it('never has two saves of one key in flight, and chains the next using the new version', async () => {
    const calls = [];
    let release;
    const send = (k, v, base) => new Promise((res) => {
      calls.push([v.n, base]);
      release = () => res({ saved: { ...v, version: base + 1 } });
    });
    const { saver } = setup(send);
    saver.edit('a', { n: 1 });
    await new Promise((r) => setTimeout(r, 25)); // first save now in flight
    saver.edit('a', { n: 2 });
    await new Promise((r) => setTimeout(r, 25));
    expect(calls).toEqual([[1, 0]]); // second waits
    release();
    await new Promise((r) => setTimeout(r, 25));
    expect(calls).toEqual([[1, 0], [2, 1]]);
    release();
    await tick();
    expect(saver.busy('a')).toBe(false);
  });

  it('reports a conflict with the current server row and drops pending edits for that key', async () => {
    const send = async () => ({ conflict: { current: { id: 'a', version: 9, name: 'theirs' } } });
    const { saver, log } = setup(send);
    saver.edit('a', { n: 1 });
    await new Promise((r) => setTimeout(r, 30));
    expect(log.conflicts).toEqual([['a', { id: 'a', version: 9, name: 'theirs' }]]);
    expect(saver.version('a')).toBe(9);
    expect(saver.busy('a')).toBe(false);
  });

  it('treats a remote version as the new base so the next save is not a conflict', async () => {
    const send = vi.fn(async (k, v, base) => ({ saved: { ...v, version: base + 1 } }));
    const { saver } = setup(send);
    saver.setVersion('a', 4);
    saver.edit('a', { n: 1 });
    await new Promise((r) => setTimeout(r, 30));
    expect(send).toHaveBeenCalledWith('a', { n: 1 }, 4);
  });

  it('a send that throws surfaces as an error and unblocks the key', async () => {
    const errors = [];
    const saver = new Saver({ send: async () => { throw new Error('offline'); }, interval: 5, onSaved() {}, onConflict() {}, onError: (k, e) => errors.push(e.message) });
    saver.edit('a', { n: 1 });
    await new Promise((r) => setTimeout(r, 30));
    expect(errors).toEqual(['offline']);
    expect(saver.busy('a')).toBe(false);
  });
});
