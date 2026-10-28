// Records sensitive actions (view/create/update patient, create/cancel appointment, AI tool use).
// Stores only username, action and patient ID, so the log itself holds no personal details.
// Called by the other services and the AI tool; read by the admin-only audit route.
const AuditLog = require('../models/AuditLog');

async function logAction(user, action, patientId) {
  await AuditLog.create({ username: user.username, action, patientId });
}

async function listRecent(patientId, limit = 200) {
  const filter = /^P-\d{4}$/.test(patientId || '') ? { patientId } : {};
  return AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit);
}

module.exports = { logAction, listRecent };
