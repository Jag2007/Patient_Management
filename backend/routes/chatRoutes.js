// POST /api/chat: send a question to the AI assistant. Requires login (admin or staff).
// Rate limited to 20 questions per minute per user to protect against abuse and API cost.
const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireRole } = require('../middleware/auth');
const chatService = require('../services/chatService');

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user.id,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many questions, please wait a minute' },
});

router.post('/', requireRole('admin', 'staff'), chatLimiter, async (req, res) => {
  res.json(await chatService.answerQuestion(req.body?.question, req.user));
});

module.exports = router;
