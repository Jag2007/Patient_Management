// Keeps the AI chat (messages and the unsent question) while you move between pages.
// Uses sessionStorage, so it lasts only for this browser tab and is wiped on logout (see session.js).
const KEY = 'chat';
const EMPTY = { messages: [], draft: '' };

export function loadChat() {
  try {
    return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(KEY)) };
  } catch {
    return EMPTY;
  }
}

export function saveChat(chat) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(chat));
  } catch {
    // Storage can be full or blocked; the chat still works, it just won't be kept.
  }
}

export function clearChat() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
