// One AI chat owned by one user. Saved so it can be reopened and its earlier turns sent to the AI for follow-ups.
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
    // Summary of the 20 messages before the last 10, and which messages it covers (see memoryService).
    summary: { _id: false, text: String, from: Number, to: Number },
  },
  { timestamps: true }
);

conversationSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema, 'conversations');
