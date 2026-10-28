// Connects Mongoose to MONGO_URI. Used by server.js, the setup scripts and the eval.
const mongoose = require('mongoose');

async function connectDB(uri = process.env.MONGO_URI) {
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

module.exports = connectDB;
