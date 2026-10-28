// The only file that calls Groq; the API key never leaves the backend. Pass onText to stream the reply as it is written.
// Temperature 0, 15 s timeout, one short wait-and-retry on a rate limit, and Groq errors become friendly messages.
const Groq = require('groq-sdk');
const httpError = require('../utils/httpError');

const MAX_RATE_LIMIT_WAIT_S = 10;

let client;

function getClient() {
  if (!process.env.GROQ_API_KEY) throw httpError(503, 'The assistant is not configured');
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 15000, maxRetries: 0 });
  return client;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// gpt-oss sometimes sends its normal JSON reply as a call to a made-up tool (e.g. "json") and Groq rejects it.
// Groq returns what the model wrote, so we use it as the reply. It still goes through every check in chatService.
function recoverReply(error, tools) {
  const body = error.error?.error || error.error;
  if (body?.code !== 'tool_use_failed' || typeof body.failed_generation !== 'string') return null;
  try {
    const generation = JSON.parse(body.failed_generation);
    const realTools = (tools || []).map((tool) => tool.function.name);
    if (!generation?.arguments || realTools.includes(generation.name)) return null;
    return { role: 'assistant', content: JSON.stringify(generation.arguments) };
  } catch {
    return null;
  }
}

// Groq says how long to wait after a rate limit; short waits are retried once instead of failing.
function retryAfterSeconds(error) {
  const headers = error.headers;
  const raw = typeof headers?.get === 'function' ? headers.get('retry-after') : headers?.['retry-after'];
  const seconds = Number(raw);
  return raw != null && Number.isFinite(seconds) && seconds <= MAX_RATE_LIMIT_WAIT_S ? seconds : null;
}

// Joins streamed chunks back into one message: text pieces in order, tool calls pieced together by their index.
async function collectStream(stream, onText) {
  let content = '';
  const toolCalls = [];
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta || {};
    if (delta.content) {
      content += delta.content;
      onText(delta.content);
    }
    for (const part of delta.tool_calls || []) {
      const call = (toolCalls[part.index] ||= { id: '', type: 'function', function: { name: '', arguments: '' } });
      if (part.id) call.id = part.id;
      if (part.function?.name) call.function.name += part.function.name;
      if (part.function?.arguments) call.function.arguments += part.function.arguments;
    }
  }
  const calls = toolCalls.filter(Boolean);
  return { role: 'assistant', content, ...(calls.length ? { tool_calls: calls } : {}) };
}

async function chat(messages, tools, { onText, retried = false } = {}) {
  let streamed = false;
  const forward = onText && ((text) => {
    streamed = true;
    onText(text);
  });
  try {
    const request = {
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      messages,
      temperature: 0,
      max_completion_tokens: 1024,
      reasoning_effort: 'low',
      ...(tools?.length ? { tools, tool_choice: 'auto' } : {}),
    };
    if (forward) return await collectStream(await getClient().chat.completions.create({ ...request, stream: true }), forward);

    const response = await getClient().chat.completions.create(request);
    return response.choices[0].message;
  } catch (error) {
    const recovered = recoverReply(error, tools);
    if (recovered) {
      onText?.(recovered.content);
      return recovered;
    }

    // A retry after text was already streamed would repeat it, so only retry before anything was sent.
    const wait = error.status === 429 && !retried && !streamed ? retryAfterSeconds(error) : null;
    if (wait !== null) {
      await sleep(wait * 1000 + 250);
      return chat(messages, tools, { onText, retried: true });
    }

    console.error('Groq error:', error.status || '', error.message);
    if (error.status === 429) throw httpError(503, 'The assistant is busy right now, please try again in a minute');
    if (error instanceof Groq.APIConnectionTimeoutError) throw httpError(504, 'The assistant took too long to respond, please try again');
    throw httpError(502, 'The assistant is unavailable right now, please try again later');
  }
}

module.exports = { chat, collectStream, recoverReply, retryAfterSeconds };
