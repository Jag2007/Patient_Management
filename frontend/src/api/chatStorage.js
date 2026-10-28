// Keeps the open AI chat (id, messages, unsent draft) in sessionStorage so it survives page switches.
// The server keeps the full history; this just avoids reloading it. Cleared on logout by session.js.
const KEY = 'chat';
const EMPTY = { conversationId: null, messages: [], draft: '' };

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
    // Storage can be full or blocked. The chat still works, it just isn't kept.
  }
}

export function clearChat() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Storage blocked, so there's nothing to clear.
  }
}
