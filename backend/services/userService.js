// Staff account management, used only by admins (the route checks requireRole('admin')).
// Admins can list accounts, create staff logins, reset a staff password, disable/enable and delete staff.
// Admin accounts can't be changed here, so an admin can't lock themselves (or another admin) out by mistake.
// Passwords are checked for strength and stored only as bcrypt hashes; every change is written to the audit log.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const httpError = require('../utils/httpError');
const { logAccountAction } = require('./auditService');
const { forgetAccount } = require('../middleware/auth');

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
const PUBLIC_FIELDS = 'username role active lastLoginAt createdAt';

function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 64) {
    throw httpError(400, 'Password must be 8 to 64 characters');
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    throw httpError(400, 'Password must contain at least one letter and one number');
  }
  return password;
}

async function findStaff(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, 'Invalid ID');
  const user = await User.findById(id);
  if (!user) throw httpError(404, 'Account not found');
  if (user.role !== 'staff') throw httpError(403, 'Admin accounts cannot be changed here');
  return user;
}

async function listUsers() {
  return User.find({}, PUBLIC_FIELDS).sort({ role: 1, username: 1 }).lean();
}

async function createStaff(body = {}, admin) {
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  if (!USERNAME_PATTERN.test(username)) {
    throw httpError(400, 'Username must be 3 to 30 characters: lowercase letters, numbers, dot, dash or underscore');
  }
  const passwordHash = await bcrypt.hash(checkPassword(body.password), 10);
  if (await User.exists({ username })) throw httpError(409, 'That username is already taken');

  const user = await User.create({ username, passwordHash, role: 'staff' });
  await logAccountAction(admin, 'staff.create', username);
  return User.findById(user._id, PUBLIC_FIELDS).lean();
}

async function resetPassword(id, password, admin) {
  const user = await findStaff(id);
  user.passwordHash = await bcrypt.hash(checkPassword(password), 10);
  await user.save();
  forgetAccount(user._id);
  await logAccountAction(admin, 'staff.reset_password', user.username);
}

async function setActive(id, active, admin) {
  if (typeof active !== 'boolean') throw httpError(400, 'active must be true or false');
  const user = await findStaff(id);
  user.active = active;
  await user.save();
  forgetAccount(user._id);
  await logAccountAction(admin, active ? 'staff.enable' : 'staff.disable', user.username);
  return User.findById(user._id, PUBLIC_FIELDS).lean();
}

async function deleteStaff(id, admin) {
  const user = await findStaff(id);
  await user.deleteOne();
  forgetAccount(user._id);
  await logAccountAction(admin, 'staff.delete', user.username);
}

module.exports = { listUsers, createStaff, resetPassword, setActive, deleteStaff, checkPassword };
