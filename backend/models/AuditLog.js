// One row per sensitive action: who did what to which patient, and when.
// Only the patient ID is stored, never names or contact details.
// Written by auditService, read only by admins through /api/audit-logs.
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    action: { type: String, required: true },
    patientId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('AuditLog', auditLogSchema, 'audit_logs');
