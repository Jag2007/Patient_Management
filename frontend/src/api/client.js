// Shared axios instance for the backend API: adds the access token, and when it expires (401) gets a new one
// from /auth/refresh and retries once. If that fails too, you go back to /login.
import axios from 'axios';
import { getToken, clearSession, saveSession } from './session';

// Locally Vite proxies /api to the backend; when hosted (e.g. Vercel) VITE_API_BASE_URL points at it.
// withCredentials lets the browser send the httpOnly refresh-token cookie.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const api = axios.create({ baseURL: API_BASE_URL, timeout: 20000, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If several requests expire at once they all wait for the same refresh call.
let refreshing = null;

export function refreshSession() {
  refreshing ??= api
    .post('/auth/refresh')
    .then(({ data }) => saveSession(data))
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    // Auth calls return 401 for a wrong password or a dead session; those go straight back to the caller.
    const isAuthCall = config?.url?.startsWith('/auth/');
    if (response?.status !== 401 || isAuthCall) return Promise.reject(error);

    if (!config.retried) {
      try {
        await refreshSession();
        return api({ ...config, retried: true });
      } catch {
        // Refresh failed: fall through to the login page.
      }
    }
    clearSession();
    window.location.href = '/login';
    return Promise.reject(error);
  }
);

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    clearSession();
  }
}

export function errorMessage(error) {
  if (error.response?.data?.error) return error.response.data.error;
  if (error.code === 'ECONNABORTED') return 'The server took too long to respond';
  if (!error.response) return 'Cannot reach the server. Is the backend running?';
  return 'Something went wrong, please try again';
}

export function showFieldErrors(form, error) {
  const fields = error.response?.data?.fields || {};
  form.setFields(Object.entries(fields).map(([name, message]) => ({ name, errors: [message] })));
}

export default api;
