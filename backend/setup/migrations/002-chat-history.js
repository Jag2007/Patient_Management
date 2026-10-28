// Adds the conversations collection for stored AI chat history (one document per chat, owned by one user).
const { ensureCollection } = require('./helpers');

module.exports = {
  description: 'conversations (AI chat history) + index',

  async up(db) {
    await ensureCollection(db, 'conversations', {
      bsonType: 'object',
      required: ['user', 'title', 'messages'],
      properties: {
        user: { bsonType: 'objectId' },
        title: { bsonType: 'string', maxLength: 80 },
        messages: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['role', 'text'],
            properties: { role: { enum: ['user', 'assistant'] }, text: { bsonType: 'string' } },
          },
        },
      },
    });
    await db.collection('conversations').createIndex({ user: 1, updatedAt: -1 });
  },
};
