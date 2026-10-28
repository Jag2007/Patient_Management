// Records sensitive actions (view/create/update patient, create/cancel appointment, AI tool use).
// Stores only username, action and patient ID, so the log itself holds no personal details.
// When an admin reads the log, current patient names are looked up and added for display only (never stored).
// Called by the other services and the AI tool; read by the admin-only audit route.
const AuditLog = require('../models/AuditLog');
const Patient = require('../models/Patient');

async function logAction(user, action, patientId) {
  await AuditLog.create({ username: user.username, action, patientId });
}

async function listRecent(patientId, limit = 200) {
  const filter = /^P-\d{4}$/.test(patientId || '') ? { patientId } : {};
  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

  const ids = [...new Set(logs.map((log) => log.patientId).filter(Boolean))];
  const patients = await Patient.find({ patientId: { $in: ids } }, 'patientId name').lean();
  const nameById = Object.fromEntries(patients.map((p) => [p.patientId, p.name]));

  return logs.map((log) => ({ ...log, patientName: nameById[log.patientId] || null }));
}

module.exports = { logAction, listRecent };
