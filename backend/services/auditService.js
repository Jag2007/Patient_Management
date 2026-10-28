// Records sensitive actions (view/create/update patient, create/edit/cancel appointment, AI tool use, staff account changes).
// Stores only username, action and patient ID, so the log itself holds no personal details.
// When an admin reads the log, current patient names are joined in (one $lookup) for display only, never stored.
// Called by the other services and the AI tool; read by the admin-only audit route.
const AuditLog = require('../models/AuditLog');

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
  return AuditLog.aggregate([
    { $match: filter },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    { $lookup: { from: 'patients', localField: 'patientId', foreignField: 'patientId', as: 'patient', pipeline: [{ $project: { _id: 0, name: 1 } }] } },
    { $set: { patientName: { $ifNull: [{ $first: '$patient.name' }, null] } } },
    { $unset: 'patient' },
  ]);
}

module.exports = { logAction, logAccountAction, listRecent };
