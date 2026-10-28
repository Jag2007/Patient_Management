// Login, refresh and logout. A login gives a short-lived access token (JWT, 15 min) and a long-lived refresh token (7 days).
// The refresh token lives in an httpOnly cookie, is stored only as a hash, and is swapped for a new one every time it's used.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const httpError = require('../utils/httpError');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_DAYS = 7;

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function issueTokens(user) {
  const payload = { id: user._id, username: user.username, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

  const refreshToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ user: user._id, tokenHash: hash(refreshToken), expiresAt });

  return { token, refreshToken, expiresAt, user: { username: user.username, role: user.role } };
}

async function login(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') {
    throw httpError(400, 'Username and password are required');
  }

  const user = await User.findOne({ username: username.trim().toLowerCase() });
  // Same message for an unknown user and a wrong password, so usernames can't be guessed.
  // A disabled account is only told so after the right password.
  const passwordOk = user && (await bcrypt.compare(password, user.passwordHash));
  if (!passwordOk) throw httpError(401, 'Invalid username or password');
  if (!user.active) throw httpError(403, 'This account has been disabled. Please contact an admin.');

  // Not awaited: the user doesn't need to wait for this. A failure is just logged.
  User.updateOne({ _id: user._id }, { lastLoginAt: new Date() }).catch((error) => console.error('lastLoginAt update failed:', error.message));

  return issueTokens(user);
}

// Deleting the old token in the same step we find it means a refresh token works exactly once.
async function refresh(refreshToken) {
  if (typeof refreshToken !== 'string' || !refreshToken) throw httpError(401, 'Session expired, please log in again');

  const stored = await RefreshToken.findOneAndDelete({ tokenHash: hash(refreshToken), expiresAt: { $gt: new Date() } });
  if (!stored) throw httpError(401, 'Session expired, please log in again');

  const user = await User.findById(stored.user);
  if (!user || !user.active) throw httpError(401, 'Your account is no longer active, please contact an admin');
  return issueTokens(user);
}

async function logout(refreshToken) {
  if (typeof refreshToken === 'string' && refreshToken) await RefreshToken.deleteOne({ tokenHash: hash(refreshToken) });
}

// Used when an admin disables, deletes or resets a staff account: every open session for that user ends.
async function revokeAllFor(userId) {
  await RefreshToken.deleteMany({ user: userId });
}

module.exports = { login, refresh, logout, revokeAllFor };
