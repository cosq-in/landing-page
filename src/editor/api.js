// Local dev talks to a local Honbu; a production build talks to the live one unless VITE_HONBU_URL says otherwise.
const DEFAULT_HONBU = import.meta.env.DEV ? 'http://localhost:8080' : 'https://kurukuru-honbu.onrender.com';
const BASE = (import.meta.env.VITE_HONBU_URL || DEFAULT_HONBU).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, message, retryAfter = 0, body = null) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
    this.body = body; // parsed JSON error body, e.g. {error: 'conflict', current: {...}}
  }
}

async function request(path, { token, body, method } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && { 'Content-Type': 'application/json' }) },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, `Can't reach Honbu at ${BASE}`);
  }
  if (!res.ok) {
    const retry = parseInt(res.headers.get('Retry-After') || '0', 10);
    const text = (await res.text()).trim();
    let body = null;
    try { body = JSON.parse(text); } catch { /* plain-text error */ }
    throw new ApiError(res.status, res.status === 429 ? 'Too many attempts' : text || `Error ${res.status}`, retry, body);
  }
  return res.json();
}

export const login = (password, name) => request('/api/editor/login', { body: { password, name } });
const book = (view) => `book=${encodeURIComponent(view)}`;
export const fetchRegion = (token, view) => request(`/api/editor/region?${book(view)}`, { token });
export const fetchCandidates = (token, view) => request(`/api/editor/candidates?${book(view)}`, { token });
export const fetchTileManifest = (token, level) => request(`/api/editor/tiles/manifest?level=${encodeURIComponent(level)}`, { token });

/** One baked voxel tile, or null when that tile is empty (open ground). */
export async function fetchTile(token, level, tile) {
  try {
    return await request(`/api/editor/tiles/${encodeURIComponent(level)}/${tile}`, { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
export const fetchState = (token, view) => request(`/api/editor/state?${book(view)}`, { token });
export const markDone = (token, view, ids) => request(`/api/editor/done?${book(view)}`, { token, body: { ids } });
export const setPresence = (token, view, selected) => request(`/api/editor/presence?${book(view)}`, { token, body: { selected } });
/** Throws away this view's draft and reloads it from the server's live book. */
export const importLive = (token, view) => request(`/api/editor/import?${book(view)}`, { token, method: 'POST', body: {} });
export const openEvents = (token, view, signal) => fetch(`${BASE}/api/editor/events?${book(view)}`, { headers: { Authorization: `Bearer ${token}` }, signal });

// Saves return {saved} or, when someone else saved first (409), {conflict: {current}} with the server's copy (null if deleted).
async function save(path, token, method, body) {
  try {
    return { saved: await request(path, { token, method, body }) };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) return { conflict: { current: e.body?.current ?? null } };
    throw e;
  }
}

const PLACE_FIELDS = ['name', 'category', 'subcategory', 'hook', 'area', 'lat', 'lng', 'radius_m'];
export const pickPlace = (p) => Object.fromEntries(PLACE_FIELDS.map((k) => [k, p[k]]));

export const savePlace = (token, view, id, place, baseVersion) =>
  save(`/api/editor/places/${encodeURIComponent(id)}?${book(view)}`, token, 'PUT', { ...pickPlace(place), base_version: baseVersion });
export const saveBook = (token, view, b, baseVersion) =>
  save(`/api/editor/book?${book(view)}`, token, 'PUT', { slug: b.slug, name: b.name, college_domain: b.college_domain, ring: b.ring, base_version: baseVersion });

/** Deleting resolves to {deleted: version} or {conflict: {current}}. */
export async function removePlace(token, view, id, version) {
  try {
    return { deleted: (await request(`/api/editor/places/${encodeURIComponent(id)}?version=${version}&${book(view)}`, { token, method: 'DELETE' })).version };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) return { conflict: { current: e.body?.current ?? null } };
    throw e;
  }
}
