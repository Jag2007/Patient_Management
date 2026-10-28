// Connects to MongoDB using the MONGO_URI from .env.
// server.js calls this once at startup; the seed script and tests reuse it.
// Keeping it in one place means the connection settings live in a single file.
const mongoose = require('mongoose');

async function connectDB(uri = process.env.MONGO_URI) {
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

module.exports = connectDB;
