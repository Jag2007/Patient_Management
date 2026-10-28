// AI assistant routes: ask a question, and list, open or delete your own chats. Calls conversationService.
// Asking is limited to 20 questions a minute per user to keep API costs down.
const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireRole } = require('../middleware/auth');
const conversationService = require('../services/conversationService');

const router = express.Router();
router.use(requireRole('admin', 'staff'));

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user.id,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many questions, please wait a minute' },
});

router.post('/', chatLimiter, async (req, res) => {
  res.json(await conversationService.ask(req.body?.question, req.body?.conversationId, req.user));
});

router.get('/conversations', async (req, res) => {
  res.json(await conversationService.listConversations(req.user));
});

router.get('/conversations/:id', async (req, res) => {
  res.json(await conversationService.getConversation(req.params.id, req.user));
});

router.delete('/conversations/:id', async (req, res) => {
  await conversationService.deleteConversation(req.params.id, req.user);
  res.status(204).end();
});

module.exports = router;
