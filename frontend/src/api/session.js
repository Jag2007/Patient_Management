// Saves the short-lived access token and role in localStorage (the refresh token is an httpOnly cookie the page can't read).
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
