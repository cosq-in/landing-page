import { request } from '../editor/api';

export { ApiError } from '../editor/api';

export const login = (password, name) => request('/api/admin/login', { body: { password, name } });
export const listFlags = (token) => request('/api/admin/flags', { token });
export const putFlag = (token, key, payload) => request(`/api/admin/flags/${encodeURIComponent(key)}`, { token, method: 'PUT', body: payload });
export const resetFlag = (token, key) => request(`/api/admin/flags/${encodeURIComponent(key)}`, { token, method: 'DELETE' });
export const searchUsers = (token, q) => request(`/api/admin/users?q=${encodeURIComponent(q)}`, { token });
export const getUser = (token, id) => request(`/api/admin/users/${encodeURIComponent(id)}`, { token });
export const auditLog = (token, limit = 100) => request(`/api/admin/audit?limit=${limit}`, { token });
