// Records sensitive actions (view/create/update patient, create/edit/cancel appointment, AI tool use, staff account changes).
// Stores only username, action and patient ID, so the log itself holds no personal details.
// When an admin reads the log, current patient names are looked up and added for display only (never stored).
// Called by the other services and the AI tool; read by the admin-only audit route.
const AuditLog = require('../models/AuditLog');
const Patient = require('../models/Patient');

// Pass a session to save the entry inside the caller's transaction (see utils/withTransaction.js).
async function logAction(user, action, patientId, session) {
  await AuditLog.create([{ username: user.username, action, patientId }], { session });
}

// For staff-account changes made by an admin: records which account was changed instead of a patient.
async function logAccountAction(user, action, targetUsername) {
  await AuditLog.create({ username: user.username, action, targetUsername });
}

async function listRecent(patientId, limit = 200) {
  const filter = /^P-\d{4}$/.test(patientId || '') ? { patientId } : {};
  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

  const ids = [...new Set(logs.map((log) => log.patientId).filter(Boolean))];
  const patients = await Patient.find({ patientId: { $in: ids } }, 'patientId name').lean();
  const nameById = Object.fromEntries(patients.map((p) => [p.patientId, p.name]));

  return logs.map((log) => ({ ...log, patientName: nameById[log.patientId] || null }));
}

module.exports = { logAction, logAccountAction, listRecent };
