// Chat history: saves each question and answer to the user's Conversation, and lists, opens and deletes chats.
// Earlier turns are read from our database, never the browser, so a client can't fake what the AI said before.
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const httpError = require('../utils/httpError');
const chatService = require('./chatService');

const HISTORY_MESSAGES = 6; // last 3 questions and their answers

// Every chat query includes the user's ID, so nobody can open or delete someone else's chat.
function ownChat(id, user) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, 'Invalid conversation ID');
  return { _id: id, user: user.id };
}

async function listConversations(user) {
  return Conversation.find({ user: user.id }, 'title updatedAt').sort({ updatedAt: -1 }).limit(50).lean();
}

async function getConversation(id, user) {
  const conversation = await Conversation.findOne(ownChat(id, user)).lean();
  if (!conversation) throw httpError(404, 'Conversation not found');
  return conversation;
}

async function deleteConversation(id, user) {
  const result = await Conversation.deleteOne(ownChat(id, user));
  if (result.deletedCount === 0) throw httpError(404, 'Conversation not found');
}

async function ask(question, conversationId, user) {
  const conversation = conversationId ? await Conversation.findOne(ownChat(conversationId, user)) : null;
  if (conversationId && !conversation) throw httpError(404, 'Conversation not found');

  const history = (conversation?.messages || []).slice(-HISTORY_MESSAGES).map(({ role, text }) => ({ role, text }));
  const result = await chatService.answerQuestion(question, user, history);

  const turn = [
    { role: 'user', text: chatService.checkQuestion(question) },
    { role: 'assistant', text: result.answer, sources: result.sources, verified: result.verified },
  ];
  const saved = conversation
    ? await Conversation.findOneAndUpdate({ _id: conversation._id }, { $push: { messages: { $each: turn } } }, { returnDocument: 'after' })
    : await Conversation.create({ user: user.id, title: turn[0].text.slice(0, 80), messages: turn });

  return { ...result, conversationId: saved._id };
}

module.exports = { listConversations, getConversation, deleteConversation, ask };
