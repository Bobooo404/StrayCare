/**
 * Thin fetch wrapper around the StrayCare REST API.
 *
 * The auth token lives in an httpOnly cookie set by the server, so requests
 * must be sent with `credentials: 'include'`. In development Vite proxies
 * `/api` to the Express server, which keeps everything same-origin.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const SESSION_TOKEN_KEY = 'straycare_session_token';

// Cookies remain the preferred, httpOnly session mechanism. This short-lived
// browser-session token is only a fallback for separately hosted frontend/API
// deployments where a browser blocks third-party cookies. sessionStorage is
// intentionally used instead of localStorage so it is cleared with the tab.
export function getSessionToken() {
  try {
    return window.sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token) {
  try {
    if (token) window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    else window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Storage can be disabled; the httpOnly cookie route still works.
  }
}

export class ApiError extends Error {
  constructor(message, { status, errors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // Field level messages, keyed by input name, for inline form errors.
    this.errors = errors || null;
  }
}

/**
 * Shown whenever the API itself cannot be reached, which almost always means
 * the Express server was never started. Name the exact command so the cause
 * is obvious instead of a bare "500".
 */
const API_UNREACHABLE =
  'Cannot reach the StrayCare API. Start it in another terminal with "npm run dev:memory" (server folder), then reload this page.';

export { API_UNREACHABLE };

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const isFormData = body instanceof FormData;
  const sessionToken = getSessionToken();

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      // Required for the httpOnly auth cookie to travel with the request.
      credentials: 'include',
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        ...headers,
      },
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(API_UNREACHABLE, { status: 0 });
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    // In development Vite proxies `/api` to Express. When the API is not
    // running, the proxy answers with a bare 500 and an empty body, which
    // would otherwise surface as a meaningless "status 500" in the UI. The
    // real problem is almost always that the server was never started.
    if (payload === null && response.status >= 500) {
      throw new ApiError(API_UNREACHABLE, { status: response.status });
    }

    throw new ApiError(
      payload?.message || `Request failed with status ${response.status}`,
      { status: response.status, errors: payload?.errors }
    );
  }

  return payload;
}

const get = (path, options) => request(path, { ...options, method: 'GET' });
const post = (path, body, options) => request(path, { ...options, method: 'POST', body });
const patch = (path, body, options) => request(path, { ...options, method: 'PATCH', body });
const del = (path, options) => request(path, { ...options, method: 'DELETE' });

const toQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

export const api = {
  health: () => get('/health'),
  stats: () => get('/stats'),
  ai: {
    status: () => get('/ai/status'),
    triage: (formData) => post('/ai/triage', formData),
    nearby: (params) => get(`/ai/nearby${toQuery(params)}`),
  },

  auth: {
    me: () => get('/auth/me'),
    login: (credentials) => post('/auth/login', credentials),
    register: (details) => post('/auth/register', details),
    logout: () => post('/auth/logout'),
    updateProfile: (details) => patch('/auth/me', details),
  },

  ngo: {
    login: (credentials) => post('/ngo/login', credentials),
    register: (details) => post('/ngo/register', details),
    me: () => get('/ngo/me'),
    updateProfile: (details) => patch('/ngo/me', details),
    reports: (params, options) => get(`/ngo/reports${toQuery(params)}`, options),
    stats: (params) => get(`/ngo/reports/stats${toQuery(params)}`),
    claim: (category, id, notes) => patch(`/ngo/reports/${category}/${id}/claim`, { notes }),
    setStatus: (category, id, body) => patch(`/ngo/reports/${category}/${id}/status`, body),
  },

  reports: {
    mine: (params) => get(`/reports/mine${toQuery(params)}`),
    create: (category, formData) => post(`/reports/${category}`, formData),
    byId: (category, id) => get(`/reports/${category}/${id}`),
  },

  adoptions: {
    list: (params) => get(`/adoptions${toQuery(params)}`),
    mine: () => get('/adoptions/mine'),
    create: (formData) => post('/adoptions', formData),
    update: (id, formData) => patch(`/adoptions/${id}`, formData),
    remove: (id) => del(`/adoptions/${id}`),
  },
};

export default api;
