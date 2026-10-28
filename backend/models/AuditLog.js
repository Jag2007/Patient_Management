// One row per sensitive action: who did what to which patient (or which staff account), and when.
// Only the patient ID or the account's username is stored, never names or contact details.
// Written by auditService, read only by admins through /api/audit-logs.
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    action: { type: String, required: true },
    patientId: { type: String },
    targetUsername: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// The log is always read newest first, either all of it or one patient's history.
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema, 'audit_logs');
