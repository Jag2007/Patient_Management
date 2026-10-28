// Saves the logged-in user's token and role in localStorage. The role only hides menu items; the backend checks every request.
// Logging out also clears the saved AI chat so the next person can't see it.
import { clearChat } from './chatStorage';

const KEY = 'session';

export function saveSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function getToken() {
  return getSession()?.token;
}

export function clearSession() {
  localStorage.removeItem(KEY);
  clearChat();
}
