// Auth routes (public): login, refresh and logout. The refresh token travels only in an httpOnly cookie.
// Failed logins are limited to 10 per 15 minutes per IP to slow down password guessing.
const express = require('express');
const rateLimit = require('express-rate-limit');
const authService = require('../services/authService');

const router = express.Router();
const COOKIE = 'refreshToken';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many failed login attempts, please try again in 15 minutes' },
});

// httpOnly: page JavaScript can't read it. path: only sent to /api/auth. In production the frontend and API
// are on different sites (Vercel + Render), which needs SameSite=None and Secure.
function cookieOptions() {
  const production = process.env.NODE_ENV === 'production';
  return { httpOnly: true, secure: production, sameSite: production ? 'none' : 'strict', path: '/api/auth' };
}

function sendTokens(res, { token, refreshToken, expiresAt, user }) {
  res.cookie(COOKIE, refreshToken, { ...cookieOptions(), expires: expiresAt });
  res.json({ token, user });
}

router.post('/login', loginLimiter, async (req, res) => {
  sendTokens(res, await authService.login(req.body?.username, req.body?.password));
});

router.post('/refresh', async (req, res) => {
  try {
    sendTokens(res, await authService.refresh(req.cookies[COOKIE]));
  } catch (error) {
    res.clearCookie(COOKIE, cookieOptions());
    throw error;
  }
});

router.post('/logout', async (req, res) => {
  await authService.logout(req.cookies[COOKIE]);
  res.clearCookie(COOKIE, cookieOptions());
  res.status(204).end();
});

module.exports = router;
