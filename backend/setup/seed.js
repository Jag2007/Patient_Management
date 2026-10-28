// Resets the demo data: users, patients and appointments from seed-data/, plus FAQ sections split from backend/docs.
// Appointment dates are stored as days from today, so there are always past and upcoming visits. Run npm run migrate first.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const AuditLog = require('../models/AuditLog');
const FaqSection = require('../models/FaqSection');
const Conversation = require('../models/Conversation');

const DAY = 24 * 60 * 60 * 1000;
const users = require('./seed-data/users.json');
const patients = require('./seed-data/patients.json');
const appointments = require('./seed-data/appointments.json');

function at10am(daysFromToday) {
  const date = new Date(Date.now() + daysFromToday * DAY);
  date.setHours(10, 0, 0, 0);
  return date;
}

function readFaqSections() {
  const docsDir = path.join(__dirname, '..', 'docs');
  const sections = [];
  for (const file of fs.readdirSync(docsDir).filter((name) => name.endsWith('.md'))) {
    const [titleLine, ...rest] = fs.readFileSync(path.join(docsDir, file), 'utf8').split(/\n\s*\n/);
    const title = titleLine.replace(/^#\s*/, '').trim();
    rest.forEach((paragraph, index) => {
      sections.push({ source: file, section: index + 1, text: `${title}: ${paragraph.trim()}` });
    });
  }
  return sections;
}

async function seed() {
  await connectDB();
  const models = [User, Patient, Appointment, AuditLog, FaqSection, Conversation];
  await Promise.all(models.map((model) => model.deleteMany({})));

  await User.create(
    await Promise.all(users.map(async ({ username, password, role }) => ({ username, role, passwordHash: await bcrypt.hash(password, 10) })))
  );

  const createdPatients = await Patient.create(patients);
  const idByPatientId = Object.fromEntries(createdPatients.map((p) => [p.patientId, p._id]));

  await Appointment.create(
    appointments.map(({ patientId, daysFromToday, clinician, reason, status }) => ({
      patient: idByPatientId[patientId],
      dateTime: at10am(daysFromToday),
      clinician,
      reason,
      status,
    }))
  );

  const faqSections = await FaqSection.create(readFaqSections());
  await Promise.all(models.map((model) => model.syncIndexes()));

  console.log(`Seeded ${users.length} users, ${createdPatients.length} patients, ${appointments.length} appointments, ${faqSections.length} FAQ sections`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('Seeding failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
