const BASE = (import.meta.env.VITE_HONBU_URL || 'http://localhost:8080').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, message, retryAfter = 0) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

async function request(path, { token, body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method: body ? 'POST' : 'GET',
      headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && { 'Content-Type': 'application/json' }) },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, `Can't reach Honbu at ${BASE}`);
  }
  if (!res.ok) {
    const retry = parseInt(res.headers.get('Retry-After') || '0', 10);
    const text = (await res.text()).trim();
    throw new ApiError(res.status, res.status === 429 ? 'Too many attempts' : text || `Error ${res.status}`, retry);
  }
  return res.json();
}

export const login = (password) => request('/api/editor/login', { body: { password } });
export const fetchRegion = (token) => request('/api/editor/region', { token });
export const fetchCandidates = (token) => request('/api/editor/candidates', { token });
