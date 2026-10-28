// Session memory tests: the last 10 messages go to the AI as they are, the 20 before them as a stored summary,
// older ones are dropped, and a summary is only used when it covers exactly the right messages.
jest.mock('../services/llmService');
jest.mock('../services/judgeService');

const llm = require('../services/llmService');
const judge = require('../services/judgeService');
const Conversation = require('../models/Conversation');
const FaqSection = require('../models/FaqSection');
const User = require('../models/User');
const memory = require('../services/memoryService');
const chatService = require('../services/chatService');
const { setupTestDb, closeTestDb } = require('./helpers');

const staff = { username: 'staff', role: 'staff' };

beforeAll(async () => {
  await setupTestDb();
  await FaqSection.create({ source: 'cancellation-policy.md', section: 1, text: 'Cancellation Policy: The late cancellation fee is 300 rupees.' });
});
beforeEach(() => {
  jest.resetAllMocks();
  judge.judgeAnswer.mockResolvedValue({ passed: true, reason: 'ok' });
  judge.judgeChat.mockResolvedValue({ passed: true, reason: 'ok' });
});
afterAll(closeTestDb);

// n messages: "question 0", "answer 1", "question 2", ...
function messages(n) {
  return Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `${i % 2 ? 'answer' : 'question'} ${i}` }));
}

async function chatWith(n, summary) {
  const user = await User.findOne({ username: 'staff' });
  return Conversation.create({ user: user._id, title: 'test', messages: messages(n), summary });
}

describe('Session memory', () => {
  test('a short chat sends every message and no summary', () => {
    expect(memory.summaryRange(8)).toBeNull();
    const { recent, summary } = memory.memoryFor({ messages: messages(8) });
    expect(recent).toHaveLength(8);
    expect(summary).toBe('');
  });

  test('the summary covers the 20 messages before the last 10, never more', () => {
    expect(memory.summaryRange(14)).toEqual({ from: 0, to: 4 });
    expect(memory.summaryRange(30)).toEqual({ from: 0, to: 20 });
    expect(memory.summaryRange(40)).toEqual({ from: 10, to: 30 });
  });

  test('sends the last 10 messages and a stored summary only if it covers the right messages', () => {
    const chat = { messages: messages(14), summary: { text: '- talked about P-0001', from: 0, to: 4 } };
    const { recent, summary } = memory.memoryFor(chat);
    expect(recent.map((m) => m.text)).toEqual(messages(14).slice(4).map((m) => m.text));
    expect(summary).toBe('- talked about P-0001');

    const stale = memory.memoryFor({ messages: messages(16), summary: chat.summary });
    expect(stale.summary).toBe('');
  });

  test('updateSummary summarises only the messages before the last 10 and stores which ones it covers', async () => {
    const chat = await chatWith(40);
    llm.chat.mockResolvedValue({ content: '- asked about Test Patient (P-0001)' });

    await memory.updateSummary(chat);

    const prompt = llm.chat.mock.calls[0][0][1].content;
    expect(prompt).toMatch(/question 10\n/);
    expect(prompt).toMatch(/answer 29/);
    expect(prompt).not.toMatch(/question 8\n|question 30/);
    const saved = await Conversation.findById(chat._id).lean();
    expect(saved.summary).toEqual({ text: '- asked about Test Patient (P-0001)', from: 10, to: 30 });
  });

  test('updateSummary does nothing for a short chat or when the stored summary still fits', async () => {
    await memory.updateSummary(await chatWith(10));
    await memory.updateSummary(await chatWith(14, { text: 'fits', from: 0, to: 4 }));
    expect(llm.chat).not.toHaveBeenCalled();
  });

  test('the AI gets the summary first, then the recent messages, all as source H1', async () => {
    llm.chat.mockResolvedValue({ content: JSON.stringify({ type: 'answer', answer: 'P-0001', used_source_ids: ['H1'] }) });
    const result = await chatService.answerQuestion('Which patient did we start with?', staff, messages(10), '- asked about P-0001');

    const prompt = llm.chat.mock.calls[0][0][1].content;
    expect(prompt).toMatch(/<conversation>\n\[H1\]\nSummary of earlier messages:\n- asked about P-0001\n\nRecent messages:\nUser: question 0/);
    expect(result.sources).toEqual([{ id: 'H1', label: 'Earlier in this chat' }]);
  });
});
