// Business logic for appointments: list, create (with date rules), edit and safe cancel.
// Edit and cancel use one atomic findOneAndUpdate that only matches "scheduled" appointments,
// so a double click or changing a completed/cancelled appointment fails cleanly with 409.
// The change and its audit entry are saved in one transaction: both are written, or neither is.
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const httpError = require('../utils/httpError');
const withTransaction = require('../utils/withTransaction');
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

async function listAppointments(patientId) {
  const filter = {};
  if (patientId) {
    const patient = await Patient.findOne({ patientId });
    if (!patient) return [];
    filter.patient = patient._id;
  }
  return Appointment.find(filter).populate('patient', 'patientId name').sort({ dateTime: -1 }).limit(500);
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

// Only date/time, clinician and reason can be edited. The patient and status cannot be changed here.
async function updateAppointment(id, body = {}, user) {
  const changes = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) changes[field] = body[field];
  }
  if (Object.keys(changes).length === 0) throw httpError(400, 'Nothing to update');
  if (changes.dateTime !== undefined) changes.dateTime = checkAppointmentDate(changes.dateTime);

  return withTransaction(async (session) => {
    const appointment = await Appointment.findOneAndUpdate({ _id: id, status: 'scheduled' }, changes, {
      returnDocument: 'after',
      runValidators: true,
      session,
    }).populate('patient', 'patientId name');

    if (!appointment) throw httpError(409, 'Only scheduled appointments can be edited');
    await logAction(user, 'appointment.update', appointment.patient.patientId, session);
    return appointment;
  });
}

async function cancelAppointment(id, user) {
  return withTransaction(async (session) => {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, status: 'scheduled' },
      { status: 'cancelled' },
      { returnDocument: 'after', session }
    ).populate('patient', 'patientId name');

    if (!appointment) throw httpError(409, 'Only scheduled appointments can be cancelled');
    await logAction(user, 'appointment.cancel', appointment.patient.patientId, session);
    return appointment;
  });
}

module.exports = { listAppointments, createAppointment, updateAppointment, cancelAppointment, checkAppointmentDate };
