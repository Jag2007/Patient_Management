// Stores the logged-in user's token and role in localStorage.
// The role is only used to show or hide menu items; the backend still checks every request.
// Logging out also wipes the saved AI chat, so the next person on this computer can't see it.
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
