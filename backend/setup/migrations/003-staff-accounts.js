// Staff management: adds the "active" flag and last login time to users, and marks existing accounts active.
const { ensureCollection } = require('./helpers');

module.exports = {
  description: 'users.active + users.lastLoginAt for staff management',

  async up(db) {
    await ensureCollection(db, 'users', {
      bsonType: 'object',
      required: ['username', 'passwordHash', 'role'],
      properties: {
        username: { bsonType: 'string' },
        passwordHash: { bsonType: 'string' },
        role: { enum: ['admin', 'staff'] },
        active: { bsonType: 'bool' },
        lastLoginAt: { bsonType: 'date' },
      },
    });
    await db.collection('users').updateMany({ active: { $exists: false } }, { $set: { active: true } });
  },
};
