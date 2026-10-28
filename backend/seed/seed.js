// Fills the database with demo data: 2 users, 10 fictional patients, 15 appointments, FAQ sections.
// It wipes these collections first, so running "npm run seed" always gives the same clean start.
// FAQ files in backend/docs are split into paragraphs; each paragraph becomes one searchable FaqSection.
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

const DAY = 24 * 60 * 60 * 1000;

const patients = [
  { name: 'Ananya Rao', dateOfBirth: '1990-05-12', phone: '9876543210', email: 'ananya.rao@example.com', address: '12 MG Road, Hyderabad' },
  { name: 'Rahul Mehta', dateOfBirth: '1985-11-03', phone: '9876543211', email: 'rahul.mehta@example.com', address: '8 Banjara Hills, Hyderabad' },
  { name: 'Priya Sharma', dateOfBirth: '1978-02-20', phone: '9876543212', email: 'priya.sharma@example.com', address: '21 Jubilee Hills, Hyderabad' },
  { name: 'Arjun Nair', dateOfBirth: '2001-08-15', phone: '9876543213', email: 'arjun.nair@example.com', address: '3 Kondapur, Hyderabad' },
  { name: 'Meera Iyer', dateOfBirth: '1965-12-01', phone: '9876543214', email: 'meera.iyer@example.com', address: '45 Gachibowli, Hyderabad' },
  { name: 'Vikram Singh', dateOfBirth: '1995-04-27', phone: '9876543215', email: 'vikram.singh@example.com', address: '17 Madhapur, Hyderabad' },
  { name: 'Sneha Reddy', dateOfBirth: '1988-09-09', phone: '9876543216', email: 'sneha.reddy@example.com', address: '6 Kukatpally, Hyderabad' },
  { name: 'Karthik Menon', dateOfBirth: '1972-07-18', phone: '9876543217', email: 'karthik.menon@example.com', address: '29 Begumpet, Hyderabad' },
  { name: 'Divya Kapoor', dateOfBirth: '2010-03-05', phone: '9876543218', email: 'divya.kapoor@example.com', address: '11 Secunderabad' },
  { name: 'Rohan Das', dateOfBirth: '1999-01-30', phone: '9876543219', email: 'rohan.das@example.com', address: '54 Miyapur, Hyderabad' },
];

// [patient index, days from today, clinician, reason, status]
const appointments = [
  [0, -30, 'Dr. Kavya Iyer', 'Annual health check-up', 'completed'],
  [0, 5, 'Dr. Kavya Iyer', 'Follow-up on blood test results', 'scheduled'],
  [1, -10, 'Dr. Suresh Patel', 'Back pain consultation', 'completed'],
  [1, 12, 'Dr. Suresh Patel', 'Physiotherapy review', 'scheduled'],
  [2, -45, 'Dr. Anita Joshi', 'Skin rash consultation', 'completed'],
  [2, 3, 'Dr. Anita Joshi', 'Dermatology follow-up', 'cancelled'],
  [3, 7, 'Dr. Kavya Iyer', 'Sports injury check', 'scheduled'],
  [4, -60, 'Dr. Suresh Patel', 'Blood pressure review', 'completed'],
  [4, 20, 'Dr. Suresh Patel', 'Blood pressure review', 'scheduled'],
  [5, -5, 'Dr. Anita Joshi', 'Allergy consultation', 'completed'],
  [6, 15, 'Dr. Kavya Iyer', 'Routine check-up', 'scheduled'],
  [7, -20, 'Dr. Suresh Patel', 'Diabetes review', 'completed'],
  [7, 30, 'Dr. Suresh Patel', 'Diabetes review', 'scheduled'],
  [8, 9, 'Dr. Anita Joshi', 'Vaccination', 'scheduled'],
  [9, -2, 'Dr. Kavya Iyer', 'Fever consultation', 'completed'],
];

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
  await Promise.all([User, Patient, Appointment, AuditLog, FaqSection].map((model) => model.deleteMany({})));

  await User.create([
    { username: 'admin', passwordHash: await bcrypt.hash('Admin@123', 10), role: 'admin' },
    { username: 'staff', passwordHash: await bcrypt.hash('Staff@123', 10), role: 'staff' },
  ]);

  const createdPatients = await Patient.create(
    patients.map((patient, index) => ({ ...patient, patientId: `P-${String(index + 1).padStart(4, '0')}` }))
  );

  await Appointment.create(
    appointments.map(([patientIndex, days, clinician, reason, status]) => ({
      patient: createdPatients[patientIndex]._id,
      dateTime: at10am(days),
      clinician,
      reason,
      status,
    }))
  );

  const faqSections = await FaqSection.create(readFaqSections());
  await Promise.all([User, Patient, Appointment, AuditLog, FaqSection].map((model) => model.syncIndexes()));

  console.log(`Seeded 2 users, ${createdPatients.length} patients, ${appointments.length} appointments, ${faqSections.length} FAQ sections`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('Seeding failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
