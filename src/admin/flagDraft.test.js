import { describe, expect, it } from 'vitest';
import { addUser, describeAudit, initDraft, isDirty, removeUser, toPayload, modeLabel } from './flagDraft';

const flag = (extra = {}) => ({
  key: 'road_runner', description: 'x', env: 'FEATURE_ROAD_RUNNER', source: 'env', mode: 'off', user_ids: [], users: [], note: '', ...extra,
});
const alice = { id: 'a-1', name: 'Alice', email: 'alice@kiit.ac.in' };
const bob = { id: 'b-2', name: 'Bob', email: 'bob@gmail.com' };

describe('draft', () => {
  it('starts as a copy of the flag and is not dirty', () => {
    const f = flag({ mode: 'users', user_ids: ['a-1'], users: [alice], note: 'hi' });
    const d = initDraft(f);
    expect(d).toEqual({ mode: 'users', people: [alice], note: 'hi' });
    expect(isDirty(d, f)).toBe(false);
  });

  it('keeps an id that could not be resolved to a person, so saving does not silently drop it', () => {
    const d = initDraft(flag({ mode: 'users', user_ids: ['a-1', 'ghost-9'], users: [alice] }));
    expect(d.people.map((p) => p.id)).toEqual(['a-1', 'ghost-9']);
    expect(d.people[1].unresolved).toBe(true);
  });

  it('is dirty after any change', () => {
    const f = flag();
    expect(isDirty({ ...initDraft(f), mode: 'all' }, f)).toBe(true);
    expect(isDirty({ ...initDraft(f), note: 'new' }, f)).toBe(true);
    expect(isDirty(addUser({ ...initDraft(f), mode: 'users' }, alice), f)).toBe(true);
  });

  it('a flag still on its env var is dirty if you pick a mode, but saving off over an env "off" is still a deliberate choice', () => {
    expect(isDirty(initDraft(flag({ source: 'env', mode: 'off' })), flag({ source: 'env', mode: 'off' }))).toBe(false);
  });

  it('adds a person once and removes by id', () => {
    let d = initDraft(flag({ mode: 'users' }));
    d = addUser(addUser(d, alice), alice);
    expect(d.people).toHaveLength(1);
    d = removeUser(addUser(d, bob), 'a-1');
    expect(d.people.map((p) => p.id)).toEqual(['b-2']);
  });
});

describe('toPayload', () => {
  it('sends only ids, and only when the mode is users', () => {
    const d = addUser(addUser({ mode: 'users', people: [], note: ' n ' }, alice), bob);
    expect(toPayload(d)).toEqual({ mode: 'users', user_ids: ['a-1', 'b-2'], note: 'n' });
    expect(toPayload({ ...d, mode: 'all' })).toEqual({ mode: 'all', user_ids: [], note: 'n' });
    expect(toPayload({ ...d, mode: 'off' }).user_ids).toEqual([]);
  });
});

describe('modeLabel', () => {
  it('reads naturally', () => {
    expect(modeLabel('off', 0)).toBe('Off for everyone');
    expect(modeLabel('all', 0)).toBe('On for everyone');
    expect(modeLabel('users', 1)).toBe('On for 1 person');
    expect(modeLabel('users', 3)).toBe('On for 3 people');
    expect(modeLabel('users', 0)).toBe('On for nobody yet');
  });
});

describe('describeAudit', () => {
  it('turns entries into sentences', () => {
    expect(describeAudit({ action: 'flag_set', target: 'road_runner', detail: { mode: 'users', users: 2, was: 'env' } })).toBe('Set road_runner to 2 people (was: its env var)');
    expect(describeAudit({ action: 'flag_set', target: 'road_runner', detail: { mode: 'all', users: 0, was: { mode: 'off', users: 0 } } })).toBe('Set road_runner to everyone (was: off)');
    expect(describeAudit({ action: 'flag_reset', target: 'road_runner', detail: {} })).toBe('Reset road_runner to its env var');
    expect(describeAudit({ action: 'user_search', target: '', detail: { q: 'harshit', results: 6 } })).toBe('Searched users for “harshit” (6 found)');
    expect(describeAudit({ action: 'user_view', target: 'abc', detail: {} })).toBe('Opened user abc');
    expect(describeAudit({ action: 'mystery', target: 'x', detail: {} })).toBe('mystery x');
  });
});
