// requireLogin checks the JWT and that the account is still active; requireRole checks the user's role.
// Every protected route uses both, so permissions are enforced by the backend, not the UI.
const jwt = require('jsonwebtoken');
const httpError = require('../utils/httpError');
const User = require('../models/User');

// The account check is cached for 30 s so most requests skip a DB query.
// userService calls forgetAccount() after any account change, so changes still apply right away.
const ACCOUNT_CACHE_MS = 30 * 1000;
const accountCache = new Map(); // user id -> { user, expiresAt }

async function findAccount(id) {
  const cached = accountCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.user;
  const user = await User.findById(id, 'username role active').lean();
  accountCache.set(id, { user, expiresAt: Date.now() + ACCOUNT_CACHE_MS });
  return user;
}

function forgetAccount(id) {
  accountCache.delete(String(id));
}

async function requireLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(httpError(401, 'Please log in'));

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(httpError(401, 'Session expired, please log in again'));
  }

  const user = await findAccount(String(payload.id));
  if (!user || !user.active) return next(httpError(401, 'Your account is no longer active, please contact an admin'));
  req.user = { id: String(user._id), username: user.username, role: user.role };
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return next(httpError(403, 'You do not have permission to do this'));
    }
    next();
  };
}

module.exports = { requireLogin, requireRole, forgetAccount };
