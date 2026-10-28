// The one axios instance every page uses to call the backend.
// It adds the login token to each request and sends the user to /login when the token is rejected (401).
// errorMessage() turns any failed request into friendly text for the UI.
import axios from 'axios';
import { getToken, clearSession } from './session';

const api = axios.create({ baseURL: '/api', timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
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

export function fieldErrors(error) {
  return error.response?.data?.fields || {};
}

export default api;
