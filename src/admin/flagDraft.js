// What the flag cards edit before anything is saved. Pure, so it can be tested without a browser.

/** The edit state of one flag: its mode, the people on its list, and the note. */
export function initDraft(flag) {
  const byId = new Map((flag.users || []).map((u) => [u.id, u]));
  const people = (flag.user_ids || []).map((id) => byId.get(id) || { id, name: '', email: '', unresolved: true });
  return { mode: flag.mode, people, note: flag.note || '' };
}

const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

export function isDirty(draft, flag) {
  return draft.mode !== flag.mode || (draft.note || '').trim() !== (flag.note || '').trim()
    || (draft.mode === 'users' && !same(draft.people.map((p) => p.id), flag.user_ids || []));
}

export const addUser = (draft, person) => (draft.people.some((p) => p.id === person.id) ? draft : { ...draft, people: [...draft.people, person] });
export const removeUser = (draft, id) => ({ ...draft, people: draft.people.filter((p) => p.id !== id) });

/** The body for PUT /api/admin/flags/{key}. A list only matters in "specific people" mode. */
export const toPayload = (draft) => ({
  mode: draft.mode,
  user_ids: draft.mode === 'users' ? draft.people.map((p) => p.id) : [],
  note: (draft.note || '').trim(),
});

export function modeLabel(mode, count) {
  if (mode === 'all') return 'On for everyone';
  if (mode === 'users') return count === 0 ? 'On for nobody yet' : `On for ${count} ${count === 1 ? 'person' : 'people'}`;
  return 'Off for everyone';
}

const who = (mode, users) => (mode === 'all' ? 'everyone' : mode === 'users' ? `${users} ${users === 1 ? 'person' : 'people'}` : 'off');

/** One audit entry as a sentence. */
export function describeAudit({ action, target, detail = {} }) {
  switch (action) {
    case 'flag_set': {
      const was = detail.was === 'env' ? 'its env var' : detail.was ? who(detail.was.mode, detail.was.users) : '?';
      return `Set ${target} to ${who(detail.mode, detail.users)} (was: ${was})`;
    }
    case 'flag_reset': return `Reset ${target} to its env var`;
    case 'user_search': return `Searched users for “${detail.q}” (${detail.results} found)`;
    case 'user_view': return `Opened user ${target}`;
    default: return `${action} ${target}`.trim();
  }
}
