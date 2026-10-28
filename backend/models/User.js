// A clinic employee who can log in (admin or staff). Patients are NOT users.
// Passwords are stored only as bcrypt hashes, never in plain text.
// Staff accounts are created, disabled and reset only by an admin (userService). A disabled account
// (active: false) can't log in, and its existing token stops working on the next request (middleware/auth.js).
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff'], required: true },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema, 'users');
