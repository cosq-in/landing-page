// Pure helpers for the Road Watch tab: labels, ages, request bodies and error wording.
// Rules mirror Honbu's internal/admin/roadwatch.go and internal/roadwatch/domain.go.

export const REPORT_STATUSES = ['open', 'reported', 'acknowledged', 'fixed', 'verified', 'reopened'];
export const OWNERS = [['kiit', 'KIIT'], ['bmc', 'BMC'], ['bda', 'BDA'], ['unknown', 'Not sure']];
export const MAX_OFFICE = 80;
export const MAX_REASON = 200;
export const PHOTO_QUEUE_CAP = 50; // the server returns at most this many

const STATUS_LABELS = { open: 'Open', reported: 'Passed on', acknowledged: 'Acknowledged', fixed: 'Marked fixed', verified: 'Fix confirmed', reopened: 'Reopened' };
const TYPE_LABELS = { pothole: 'Pothole', surface: 'Rough surface', water: 'Water', parking: 'Parking', vending: 'Vending', light: 'Street light', jam: 'Traffic jam', other: 'Other' };
const SEVERITY_LABELS = { 1: 'Minor', 2: 'Bad', 3: 'Dangerous' };

export const statusLabel = (s) => STATUS_LABELS[s] || s || '—';
export const typeLabel = (t) => TYPE_LABELS[t] || t || '—';
export const severityLabel = (n) => SEVERITY_LABELS[n] || '—';

/** Whole days since `iso`, never negative. */
export function ageDays(iso, now = Date.now()) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 86400000));
}

export function ageLabel(iso, now = Date.now()) {
  const d = ageDays(iso, now);
  if (d === 0) return 'today';
  return d === 1 ? '1 day' : `${d} days`;
}

export function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const placeLabel = (r) => [r.location_label, r.area].filter(Boolean).join(', ') || 'Unlabelled spot';

// Staff may forward from open or reopened, and set acknowledged / fixed where the server's transition table allows it.
const FORWARD_FROM = ['open', 'reopened'];
const STAFF_STATUS_FROM = { acknowledged: ['reported', 'reopened'], fixed: ['open', 'reported', 'acknowledged', 'reopened'] };

export function allowedActions(status) {
  return {
    forward: FORWARD_FROM.includes(status),
    acknowledged: STAFF_STATUS_FROM.acknowledged.includes(status),
    fixed: STAFF_STATUS_FROM.fixed.includes(status),
  };
}

/** Body for POST .../forward, or null while the form is not valid. */
export function forwardBody(office, owner, ownerConfirmed) {
  const name = (office || '').trim();
  if (!name || [...name].length > MAX_OFFICE || !OWNERS.some(([v]) => v === owner)) return null;
  return { office: name, owner, owner_confirmed: !!ownerConfirmed };
}

export const statusBody = (status) => ({ status });

/** Body for POST .../reject. Empty when there is no reason (the server accepts that). */
export function rejectBody(reason) {
  const r = (reason || '').trim();
  if (!r) return {};
  if ([...r].length > MAX_REASON) return null;
  return { reason: r };
}

export const confirmText = {
  forward: (office) => `Mark this report as passed on to ${office}? Riders who follow it will be told it was passed on. This does not mean the office has seen it.`,
  acknowledged: () => 'Mark this report as acknowledged by the office?',
  fixed: () => 'Mark this report as fixed? Riders will be asked to confirm the fix.',
  approve: () => 'Approve this photo? Other people will be able to see it.',
};

/** Plain words for what the server answered. Honbu replies with 400 / 404 / 409 and plain text. */
export function errorMessage(status, fallback = '') {
  switch (status) {
    case 0: return fallback || 'Could not reach the server.';
    case 400: return 'The server did not accept that (bad request). Check the office name (up to 80 characters) and try again.';
    case 404: return 'That item no longer exists. It may have been removed; the list has been refreshed.';
    case 409: return 'That status change is not allowed from where the report is now. The list has been refreshed.';
    case 429: return 'Too many requests. Wait a moment and try again.';
    default: return status >= 500 ? 'The server had a problem (error ' + status + '). Try again shortly.' : fallback || `Something went wrong (error ${status}).`;
  }
}

const EVENT_ACTORS = { staff: 'Staff', user: 'Rider', system: 'System' };
export const actorLabel = (a) => EVENT_ACTORS[a] || a || '';

export const photoBadge = (n) => (n >= PHOTO_QUEUE_CAP ? `${PHOTO_QUEUE_CAP}+` : String(n));
