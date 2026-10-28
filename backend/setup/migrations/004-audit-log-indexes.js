// Speed: the audit log is always read newest first (all entries, or one patient's history),
// so these indexes let MongoDB return the latest entries without sorting the whole collection.
module.exports = {
  description: 'audit_logs indexes on createdAt and patientId + createdAt',

  async up(db) {
    await db.collection('audit_logs').createIndex({ createdAt: -1 });
    await db.collection('audit_logs').createIndex({ patientId: 1, createdAt: -1 });
  },
};
