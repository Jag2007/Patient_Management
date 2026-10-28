// requireLogin: checks the JWT in the Authorization header and puts the user on req.user.
// requireRole: allows the request only if req.user.role is in the allowed list.
// Every protected route uses both, so permissions are enforced by the backend, not the UI.
const jwt = require('jsonwebtoken');
const httpError = require('../utils/httpError');

function requireLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(httpError(401, 'Please log in'));

  try {
    const { id, username, role } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id, username, role };
    next();
  } catch {
    next(httpError(401, 'Session expired, please log in again'));
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return next(httpError(403, 'You do not have permission to do this'));
    }
    next();
  };
}

module.exports = { requireLogin, requireRole };
