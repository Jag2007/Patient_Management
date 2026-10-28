// AI assistant routes: ask a question (in one piece or streamed), and list, open or delete your own chats. Calls conversationService.
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

// Same as POST / but streamed with Server-Sent Events: status steps, the answer's words as they are written ("draft"),
// then "done" with the checked reply. Headers go out with the first event, so a bad question still gets a normal 400/404.
router.post('/stream', chatLimiter, async (req, res) => {
  const send = (event, data) => {
    if (res.writableEnded) return;
    if (!res.headersSent) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    }
    res.write(`event: ${event}\ndata: ${JSON.stringify(data ?? null)}\n\n`);
    res.flush?.(); // compression would otherwise hold the events back
  };

  try {
    const result = await conversationService.ask(req.body?.question, req.body?.conversationId, req.user, send);
    send('done', result);
    res.end();
  } catch (error) {
    if (!res.headersSent) throw error; // nothing streamed yet: the normal error handler sends JSON
    send('error', { status: error.status || 500, error: error.status ? error.message : 'Something went wrong, please try again' });
    res.end();
  }
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
