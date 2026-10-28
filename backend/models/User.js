// A clinic employee who can log in (admin or staff). Patients are NOT users.
// Passwords are stored only as bcrypt hashes, never in plain text.
// Used by the login route and by requireLogin/requireRole in middleware/auth.js.
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff'], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema, 'users');
