// Shared axios instance for the backend API: adds the login token and sends you to /login on a 401.
// Also turns failed requests into readable messages and puts backend field errors under form inputs.
import axios from 'axios';
import { getToken, clearSession } from './session';

// Locally Vite proxies /api to the backend; when hosted (e.g. Vercel) VITE_API_BASE_URL points at it.
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api', timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A wrong password also returns 401; let the login page show that error instead of redirecting.
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      clearSession();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
