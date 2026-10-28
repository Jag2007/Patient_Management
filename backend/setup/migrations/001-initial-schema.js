// Creates the core collections with database-level validation and indexes.
// The Mongoose models have the full rules; this is a safety net for writes that skip the app.
const { ensureCollection } = require('./helpers');

const NUMBER = ['int', 'long', 'double'];

module.exports = {
  description: 'users, patients, appointments, audit_logs, faq_sections + indexes',

  async up(db) {
    await ensureCollection(db, 'users', {
      bsonType: 'object',
      required: ['username', 'passwordHash', 'role'],
      properties: {
        username: { bsonType: 'string' },
        passwordHash: { bsonType: 'string' },
        role: { enum: ['admin', 'staff'] },
      },
    });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });

    await ensureCollection(db, 'patients', {
      bsonType: 'object',
      required: ['patientId', 'name', 'dateOfBirth', 'phone'],
      properties: {
        patientId: { bsonType: 'string', pattern: '^P-\\d{4}$' },
        name: { bsonType: 'string', maxLength: 100 },
        dateOfBirth: { bsonType: 'date' },
        phone: { bsonType: 'string', pattern: '^\\+?\\d{10,13}$' },
        email: { bsonType: 'string' },
        address: { bsonType: 'string', maxLength: 200 },
      },
    });
    await db.collection('patients').createIndex({ patientId: 1 }, { unique: true });
    await db.collection('patients').createIndex({ name: 1 });

    await ensureCollection(db, 'appointments', {
      bsonType: 'object',
      required: ['patient', 'dateTime', 'clinician', 'reason', 'status'],
      properties: {
        patient: { bsonType: 'objectId' },
        dateTime: { bsonType: 'date' },
        clinician: { bsonType: 'string', maxLength: 100 },
        reason: { bsonType: 'string', maxLength: 300 },
        status: { enum: ['scheduled', 'completed', 'cancelled'] },
      },
    });
    await db.collection('appointments').createIndex({ patient: 1, dateTime: 1 });

    await ensureCollection(db, 'audit_logs', {
      bsonType: 'object',
      required: ['username', 'action'],
      properties: { username: { bsonType: 'string' }, action: { bsonType: 'string' }, patientId: { bsonType: 'string' } },
    });

    await ensureCollection(db, 'faq_sections', {
      bsonType: 'object',
      required: ['source', 'section', 'text'],
      properties: { source: { bsonType: 'string' }, section: { bsonType: NUMBER }, text: { bsonType: 'string' } },
    });
    await db.collection('faq_sections').createIndex({ text: 'text' });
  },
};
