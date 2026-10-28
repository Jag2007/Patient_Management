// Business logic for appointments: list, create (with date rules) and safe cancel.
// Cancel uses one atomic findOneAndUpdate that only matches "scheduled" appointments,
// so a double click or cancelling a completed appointment fails cleanly with 409.
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const httpError = require('../utils/httpError');
const { logAction } = require('./auditService');

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
  return Appointment.find(filter).populate('patient', 'patientId name').sort({ dateTime: -1 }).limit(200);
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

async function cancelAppointment(id, user) {
  const appointment = await Appointment.findOneAndUpdate(
    { _id: id, status: 'scheduled' },
    { status: 'cancelled' },
    { returnDocument: 'after' }
  ).populate('patient', 'patientId name');

  if (!appointment) throw httpError(409, 'Only scheduled appointments can be cancelled');
  await logAction(user, 'appointment.cancel', appointment.patient.patientId);
  return appointment;
}

module.exports = { listAppointments, createAppointment, cancelAppointment, checkAppointmentDate };
