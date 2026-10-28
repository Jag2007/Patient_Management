// Business logic for patients: create (with auto ID like P-0001), list/search, view and edit.
// Only whitelisted fields are copied from the request, so nobody can overwrite patientId or _id.
// Every single-patient action writes an audit entry.
const Patient = require('../models/Patient');
const httpError = require('../utils/httpError');
const escapeRegex = require('../utils/escapeRegex');
const { logAction } = require('./auditService');

const EDITABLE_FIELDS = ['name', 'dateOfBirth', 'phone', 'email', 'address'];

function pickEditableFields(body = {}) {
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

async function nextPatientId() {
  const last = await Patient.findOne().sort({ patientId: -1 });
  const nextNumber = last ? Number(last.patientId.slice(2)) + 1 : 1;
  return `P-${String(nextNumber).padStart(4, '0')}`;
}

async function listPatients(search) {
  const term = typeof search === 'string' ? search.trim() : '';
  const filter = term
    ? { $or: [{ patientId: term.toUpperCase() }, { name: new RegExp(escapeRegex(term), 'i') }] }
    : {};
  return Patient.find(filter).sort({ patientId: 1 }).limit(500).lean(); // lean: plain objects, no Mongoose overhead
}

async function getPatient(patientId, user) {
  const patient = await Patient.findOne({ patientId });
  if (!patient) throw httpError(404, 'Patient not found');
  await logAction(user, 'patient.view', patientId);
  return patient;
}

async function createPatient(body, user) {
  const patient = await Patient.create({ ...pickEditableFields(body), patientId: await nextPatientId() });
  await logAction(user, 'patient.create', patient.patientId);
  return patient;
}

async function updatePatient(patientId, body, user) {
  const patient = await Patient.findOneAndUpdate({ patientId }, pickEditableFields(body), {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!patient) throw httpError(404, 'Patient not found');
  await logAction(user, 'patient.update', patientId);
  return patient;
}

module.exports = { listPatients, getPatient, createPatient, updatePatient };
