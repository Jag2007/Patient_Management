// Login: checks the username and password and returns a signed JWT.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const httpError = require('../utils/httpError');

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

  const payload = { id: user._id, username: user.username, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
  return { token, user: { username: user.username, role: user.role } };
}

module.exports = { login };
