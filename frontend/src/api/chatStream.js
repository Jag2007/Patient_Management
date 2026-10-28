// Streams an AI answer from POST /api/chat/stream (Server-Sent Events) using fetch, since axios can't read a stream.
// Calls onStatus / onReset / onDraft as events arrive and resolves with the final checked reply.
import { API_BASE_URL, refreshSession } from './client';
import { clearSession, getToken } from './session';

// Errors look like axios errors ({ response: { status, data: { error } } }) so errorMessage() in client.js works on them.
const apiError = (status, error) => Object.assign(new Error(error), { response: { status, data: { error } } });

function post(body) {
  return fetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
    credentials: 'include',
  });
}

// An expired access token gets one refresh and one retry, like the axios client does.
async function postWithRefresh(body) {
  const response = await post(body);
  if (response.status !== 401) return response;
  try {
    await refreshSession();
  } catch {
    clearSession();
    window.location.href = '/login';
    throw apiError(401, 'Session expired, please log in again');
  }
  return post(body);
}

export async function streamChat(body, { onStatus, onReset, onDraft }) {
  const response = await postWithRefresh(body);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw apiError(response.status, data.error || 'Something went wrong, please try again');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Events are separated by a blank line: "event: name\ndata: {json}\n\n".
    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const event = block.match(/^event: (.*)$/m)?.[1];
      const data = JSON.parse(block.match(/^data: (.*)$/m)?.[1] ?? 'null');
      if (event === 'status') onStatus(data);
      else if (event === 'reset') onReset();
      else if (event === 'draft') onDraft(data);
      else if (event === 'done') return data;
      else if (event === 'error') throw apiError(data.status, data.error);
    }
  }
  throw apiError(502, 'The answer was cut off, please try again');
}
