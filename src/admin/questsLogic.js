// Pure helpers for the Quests tab: draft summaries, publish gating and wording.
// Shapes mirror Honbu's GET /api/admin/quests/{view} and POST .../publish.
import { ageLabel } from './rwLogic';

export const QUEST_VIEWS = [['kiit', 'KIIT'], ['bangalore', 'Bangalore']];
export const PUBLISH_CONFIRM = 'This replaces the live quest list for everyone.';
export const EDITOR_NOTE = 'Pick who can edit in the app under Flags, quest_editor, Specific people.';

export const viewLabel = (v) => QUEST_VIEWS.find(([id]) => id === v)?.[1] || v;

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function draftSummary(d, now = Date.now()) {
  const saved = ageLabel(d.updated_at, now);
  return {
    version: `v${d.version}`,
    editor: d.updated_by || 'nobody yet',
    places: plural(d.places, 'place'),
    saved: saved === 'today' ? saved : `${saved} ago`,
  };
}

export const canPublish = (d) => !!d && d.places > 0 && (d.errors || []).length === 0;

export function publishBlockReason(d) {
  if (!d) return 'Draft not loaded yet.';
  const n = (d.errors || []).length;
  if (n > 0) return `Fix ${plural(n, 'error')} in the editor first.`;
  if (!(d.places > 0)) return 'The draft has no places yet.';
  return '';
}

export function issueCountLabel(kind, n) {
  return n === 0 ? `No ${kind}s` : plural(n, kind);
}

export function publishResultText(r) {
  const s = r.skipped || {};
  const parts = [];
  if (s.bad) parts.push(`${s.bad} bad`);
  if (s.outside) parts.push(`${s.outside} outside the book area`);
  if (s.duplicate) parts.push(`${s.duplicate} duplicate`);
  const total = (s.bad || 0) + (s.outside || 0) + (s.duplicate || 0);
  const skipped = total ? `Skipped ${total}: ${parts.join(', ')}.` : 'Nothing skipped.';
  return `Published ${plural(r.places, 'place')} in ${plural(r.chapters, 'chapter')}. ${skipped}`;
}

export function publishErrorMessage(status, body, fallback = '') {
  switch (status) {
    case 0: return fallback || 'Could not reach the server.';
    case 404: return 'Quest book not found.';
    case 409: return body?.error === 'invalid_draft'
      ? 'The draft still has errors, so nothing was published. The list has been refreshed.'
      : 'The draft changed, so nothing was published. The list has been refreshed.';
    case 429: return 'Too many requests. Wait a moment and try again.';
    default: return status >= 500 ? `The server had a problem (error ${status}). Try again shortly.` : fallback || `Something went wrong (error ${status}).`;
  }
}
