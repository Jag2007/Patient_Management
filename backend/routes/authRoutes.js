// POST /api/auth/login: the only public endpoint. Returns a JWT and the user's role.
// Failed logins are rate limited (10 per 15 minutes per IP) to slow down password guessing;
// successful logins don't count. The frontend sends the token as "Authorization: Bearer <token>".
const express = require('express');
const rateLimit = require('express-rate-limit');
const authService = require('../services/authService');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many failed login attempts, please try again in 15 minutes' },
});

router.post('/login', loginLimiter, async (req, res) => {
  const result = await authService.login(req.body?.username, req.body?.password);
  res.json(result);
});

module.exports = router;
