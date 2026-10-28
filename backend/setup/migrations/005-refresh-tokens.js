// Refresh tokens: one document per login session, removed automatically by a TTL index when it expires.
const { ensureCollection } = require('./helpers');

module.exports = {
  description: 'refresh_tokens (login sessions) + TTL and lookup indexes',

  async up(db) {
    await ensureCollection(db, 'refresh_tokens', {
      bsonType: 'object',
      required: ['user', 'tokenHash', 'expiresAt'],
      properties: { user: { bsonType: 'objectId' }, tokenHash: { bsonType: 'string' }, expiresAt: { bsonType: 'date' } },
    });
    await db.collection('refresh_tokens').createIndex({ tokenHash: 1 }, { unique: true });
    await db.collection('refresh_tokens').createIndex({ user: 1 });
    await db.collection('refresh_tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  },
};
