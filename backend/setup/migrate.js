// Runs each migration in setup/migrations/ once, in file-name order, and records it in the "migrations" collection.
// Usage: npm run migrate   (status only: npm run migrate -- --status)
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function migrate() {
  await connectDB();
  const db = mongoose.connection.db;
  const applied = new Set((await db.collection('migrations').find().toArray()).map((m) => m.name));
  const files = fs.readdirSync(path.join(__dirname, 'migrations')).filter((f) => /^\d{3}-.*\.js$/.test(f)).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  done     ${file}`);
      continue;
    }
    if (process.argv.includes('--status')) {
      console.log(`  pending  ${file}`);
      continue;
    }
    const migration = require(path.join(__dirname, 'migrations', file));
    await migration.up(db);
    await db.collection('migrations').insertOne({ name: file, appliedAt: new Date() });
    console.log(`  applied  ${file}: ${migration.description}`);
  }
  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error('Migration failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
