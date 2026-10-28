// Shared test setup: connects to the separate TEST database (MONGO_URI_TEST), never the real one.
// Creates fresh admin and staff users and logs them in through the real /api/auth/login route.
// Every test file calls setupTestDb() in beforeAll and closeTestDb() in afterAll.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');

async function setupTestDb() {
  if (!process.env.MONGO_URI_TEST) throw new Error('MONGO_URI_TEST is not set');
  await mongoose.connect(process.env.MONGO_URI_TEST);
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.syncIndexes();

  await User.create([
    { username: 'admin', passwordHash: await bcrypt.hash('Admin@123', 10), role: 'admin' },
    { username: 'staff', passwordHash: await bcrypt.hash('Staff@123', 10), role: 'staff' },
  ]);
}

async function loginAs(username, password) {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res.body.token;
}

async function closeTestDb() {
  await mongoose.disconnect();
}

module.exports = { app, request, setupTestDb, loginAs, closeTestDb };
