// Writes and reads the audit log. Only the username, action and patient ID (or staff username) are stored.
const AuditLog = require('../models/AuditLog');

// Pass a session to write the entry inside the caller's transaction.
async function logAction(user, action, patientId, session) {
  await AuditLog.create([{ username: user.username, action, patientId }], { session });
}

// For staff account changes: stores the changed account's username instead of a patient ID.
async function logAccountAction(user, action, targetUsername) {
  await AuditLog.create({ username: user.username, action, targetUsername });
}

// Patient names are joined in for display only, they are never stored in the log.
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
