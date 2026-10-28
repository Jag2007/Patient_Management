// Patient logic: create (auto ID like P-0001), list/search, view and edit. Each single-patient action is audited.
const Patient = require('../models/Patient');
const httpError = require('../utils/httpError');
const escapeRegex = require('../utils/escapeRegex');
const pickFields = require('../utils/pickFields');
const { logAction } = require('./auditService');

const EDITABLE_FIELDS = ['name', 'dateOfBirth', 'phone', 'email', 'address'];

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
  return Patient.find(filter).sort({ patientId: 1 }).limit(500).lean(); // lean(): plain objects, faster for a read-only list
}

async function getPatient(patientId, user) {
  const patient = await Patient.findOne({ patientId });
  if (!patient) throw httpError(404, 'Patient not found');
  await logAction(user, 'patient.view', patientId);
  return patient;
}

async function createPatient(body, user) {
  const patient = await Patient.create({ ...pickFields(body, EDITABLE_FIELDS), patientId: await nextPatientId() });
  await logAction(user, 'patient.create', patient.patientId);
  return patient;
}

async function updatePatient(patientId, body, user) {
  const patient = await Patient.findOneAndUpdate({ patientId }, pickFields(body, EDITABLE_FIELDS), {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!patient) throw httpError(404, 'Patient not found');
  await logAction(user, 'patient.update', patientId);
  return patient;
}

module.exports = { listPatients, getPatient, createPatient, updatePatient };
