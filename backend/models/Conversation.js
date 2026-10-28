// One AI assistant chat, owned by the user who started it. Stores the questions and the
// backend-checked answers (with their source labels), so a chat can be reopened later
// and the assistant can use earlier turns to understand follow-ups like "which patient was that?".
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true, maxlength: 4000 },
    sources: [{ _id: false, id: String, label: String }],
    verified: { type: Boolean },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const conversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    messages: [messageSchema],
  },
  { timestamps: true }
);

conversationSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema, 'conversations');
