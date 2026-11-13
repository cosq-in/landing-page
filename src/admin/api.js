import { BASE, ApiError, request } from '../editor/api';

export { ApiError } from '../editor/api';

export const login = (password, name) => request('/api/admin/login', { body: { password, name } });
export const listFlags = (token) => request('/api/admin/flags', { token });
export const putFlag = (token, key, payload) => request(`/api/admin/flags/${encodeURIComponent(key)}`, { token, method: 'PUT', body: payload });
export const resetFlag = (token, key) => request(`/api/admin/flags/${encodeURIComponent(key)}`, { token, method: 'DELETE' });
export const searchUsers = (token, q) => request(`/api/admin/users?q=${encodeURIComponent(q)}`, { token });
export const getUser = (token, id) => request(`/api/admin/users/${encodeURIComponent(id)}`, { token });
export const auditLog = (token, limit = 100) => request(`/api/admin/audit?limit=${limit}`, { token });

export const listRwReports = (token, status) => request(`/api/admin/roadwatch/reports${status ? `?status=${encodeURIComponent(status)}` : ''}`, { token });
export const rwForward = (token, id, body) => request(`/api/admin/roadwatch/reports/${encodeURIComponent(id)}/forward`, { token, body });
export const rwSetStatus = (token, id, body) => request(`/api/admin/roadwatch/reports/${encodeURIComponent(id)}/status`, { token, body });
export const listRwPhotos = (token) => request('/api/admin/roadwatch/photos?status=pending', { token });
export const approveRwPhoto = (token, pid) => request(`/api/admin/roadwatch/photos/${encodeURIComponent(pid)}/approve`, { token, body: {} });
export const rejectRwPhoto = (token, pid, body) => request(`/api/admin/roadwatch/photos/${encodeURIComponent(pid)}/reject`, { token, body });

/** The photo is JPEG bytes behind the bearer token, so it comes back as a Blob for URL.createObjectURL. */
export async function fetchRwPhotoBlob(token, pid, signal) {
  let res;
  try {
    res = await fetch(`${BASE}/api/admin/roadwatch/photos/${encodeURIComponent(pid)}`, { headers: { Authorization: `Bearer ${token}` }, signal });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError(0, `Can't reach Honbu at ${BASE}`);
  }
  if (!res.ok) throw new ApiError(res.status, (await res.text()).trim() || `Error ${res.status}`);
  return res.blob();
}

export const getQuestDraft = (token, view) => request(`/api/admin/quests/${encodeURIComponent(view)}`, { token });
// request() sends a POST only when there is a body, so publish carries an empty one.
export const publishQuests = (token, view) => request(`/api/admin/quests/${encodeURIComponent(view)}/publish`, { token, body: {} });
