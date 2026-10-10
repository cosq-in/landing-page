const BASE = (import.meta.env.VITE_HONBU_URL || 'http://localhost:8080').replace(/\/$/, '');

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
export const fetchRegion = (token) => request('/api/editor/region', { token });
export const fetchCandidates = (token) => request('/api/editor/candidates', { token });
export const fetchState = (token) => request('/api/editor/state', { token });
export const markDone = (token, ids) => request('/api/editor/done', { token, body: { ids } });
export const setPresence = (token, selected) => request('/api/editor/presence', { token, body: { selected } });
export const openEvents = (token, signal) => fetch(`${BASE}/api/editor/events`, { headers: { Authorization: `Bearer ${token}` }, signal });

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

export const savePlace = (token, id, place, baseVersion) =>
  save(`/api/editor/places/${encodeURIComponent(id)}`, token, 'PUT', { ...pickPlace(place), base_version: baseVersion });
export const saveBook = (token, book, baseVersion) =>
  save('/api/editor/book', token, 'PUT', { slug: book.slug, name: book.name, college_domain: book.college_domain, ring: book.ring, base_version: baseVersion });

/** Deleting resolves to {deleted: version} or {conflict: {current}}. */
export async function removePlace(token, id, version) {
  try {
    return { deleted: (await request(`/api/editor/places/${encodeURIComponent(id)}?version=${version}`, { token, method: 'DELETE' })).version };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) return { conflict: { current: e.body?.current ?? null } };
    throw e;
  }
}
