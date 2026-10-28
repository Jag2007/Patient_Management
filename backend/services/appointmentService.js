// Appointment logic: list, create with date rules, edit and cancel. Every change writes an audit entry.
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const httpError = require('../utils/httpError');
const withTransaction = require('../utils/withTransaction');
const pickFields = require('../utils/pickFields');
const { logAction } = require('./auditService');

const EDITABLE_FIELDS = ['dateTime', 'clinician', 'reason'];
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function checkAppointmentDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw httpError(400, 'Appointment date is not valid');
  if (date < new Date()) throw httpError(400, 'Appointment date cannot be in the past');
  if (date > new Date(Date.now() + ONE_YEAR_MS)) {
    throw httpError(400, 'Appointment date cannot be more than one year ahead');
  }
  return date;
}

// $lookup joins each patient's ID and name in the same query; populate() would need a second one.
async function listAppointments(patientId) {
  const match = {};
  if (patientId) {
    const patient = await Patient.findOne({ patientId }, '_id').lean();
    if (!patient) return [];
    match.patient = patient._id;
  }
  return Appointment.aggregate([
    { $match: match },
    { $sort: { dateTime: -1 } },
    { $limit: 500 },
    { $lookup: { from: 'patients', localField: 'patient', foreignField: '_id', as: 'patient', pipeline: [{ $project: { patientId: 1, name: 1 } }] } },
    { $unwind: '$patient' },
  ]);
}

async function createAppointment(body = {}, user) {
  const patient = await Patient.findOne({ patientId: body.patientId });
  if (!patient) throw httpError(400, 'Please choose an existing patient');

  const appointment = await Appointment.create({
    patient: patient._id,
    dateTime: checkAppointmentDate(body.dateTime),
    clinician: body.clinician,
    reason: body.reason,
  });
  await logAction(user, 'appointment.create', patient.patientId);
  return appointment.populate('patient', 'patientId name');
}

// Matching on status 'scheduled' makes the check and the write one atomic step, so a double click
// or a completed/cancelled appointment gets a 409. The change and its audit entry share one transaction.
async function changeScheduled(id, changes, user, action, conflictMessage) {
  return withTransaction(async (session) => {
    const appointment = await Appointment.findOneAndUpdate({ _id: id, status: 'scheduled' }, changes, {
      returnDocument: 'after',
      runValidators: true,
      session,
    }).populate('patient', 'patientId name');

    if (!appointment) throw httpError(409, conflictMessage);
    await logAction(user, action, appointment.patient.patientId, session);
    return appointment;
  });
}

// The patient and status can't be changed through an edit.
async function updateAppointment(id, body, user) {
  const changes = pickFields(body, EDITABLE_FIELDS);
  if (Object.keys(changes).length === 0) throw httpError(400, 'Nothing to update');
  if (changes.dateTime !== undefined) changes.dateTime = checkAppointmentDate(changes.dateTime);
  return changeScheduled(id, changes, user, 'appointment.update', 'Only scheduled appointments can be edited');
}

async function cancelAppointment(id, user) {
  return changeScheduled(id, { status: 'cancelled' }, user, 'appointment.cancel', 'Only scheduled appointments can be cancelled');
}

module.exports = { listAppointments, createAppointment, updateAppointment, cancelAppointment, checkAppointmentDate };
