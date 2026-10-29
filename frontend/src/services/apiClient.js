// One place for talking to the Lumaya backend: base URL, auth header, JSON, errors.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Calls the backend with the signed-in user's token.
 * `body` is sent as JSON; `query` is appended as a query string.
 * Resolves to the parsed JSON, or to the raw Response when `raw` is true (file downloads).
 */
export async function apiFetch(path, { method = 'GET', body, query, raw = false, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = localStorage.getItem('authToken');
    if (!token) throw new ApiError('No authentication token found', 401);
    headers.Authorization = `Bearer ${token}`;
  }

  const search = query
    ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''))}`
    : '';

  const response = await fetch(`${API_BASE_URL}${path}${search}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (raw && response.ok) return response;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error || `Server error: ${response.status}`, response.status, data);
  }
  return data;
}
