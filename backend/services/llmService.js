// The only file that talks to Groq. The API key is read from .env and never leaves the backend.
// Settings are chosen for reliability: temperature 0, a 15 second timeout, and no automatic retries.
// Groq errors are turned into friendly messages (busy, too slow, unavailable) for the user.
const Groq = require('groq-sdk');
const httpError = require('../utils/httpError');

let client;

function getClient() {
  if (!process.env.GROQ_API_KEY) throw httpError(503, 'The assistant is not configured');
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 15000, maxRetries: 0 });
  return client;
}

async function chat(messages, tools) {
  try {
    const response = await getClient().chat.completions.create({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      messages,
      temperature: 0,
      max_completion_tokens: 1024,
      reasoning_effort: 'low',
      ...(tools?.length ? { tools, tool_choice: 'auto' } : {}),
    });
    return response.choices[0].message;
  } catch (error) {
    console.error('Groq error:', error.status || '', error.message);
    if (error.status === 429) throw httpError(503, 'The assistant is busy right now, please try again in a minute');
    if (error instanceof Groq.APIConnectionTimeoutError) throw httpError(504, 'The assistant took too long to respond, please try again');
    throw httpError(502, 'The assistant is unavailable right now, please try again later');
  }
}

module.exports = { chat };
