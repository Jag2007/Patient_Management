// Audit log model: who did what to which patient or staff account. No names or contact details are stored.
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

// Read newest first, either all entries or one patient's history.
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema, 'audit_logs');
