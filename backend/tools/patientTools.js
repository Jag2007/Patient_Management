// The two tools the AI can request: get_patient_appointments and get_patient_details.
// The model only ASKS for a tool. The backend checks the user's role, validates the arguments
// (exactly one: patientId like P-0001, or a patient name), finds the patient, writes an audit entry,
// runs one fixed read-only query, and returns only the fields listed below. No other database access.
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const { logAction } = require('../services/auditService');

const TOOL_PERMISSIONS = {
  get_patient_appointments: ['admin', 'staff'],
  get_patient_details: ['admin', 'staff'],
};

const PATIENT_ARGUMENTS = {
  type: 'object',
  properties: {
    patientId: { type: 'string', description: 'Patient ID in the format P-0000' },
    name: { type: 'string', description: 'Patient name, used only when no patient ID is given' },
  },
  additionalProperties: false,
};

const definitions = [
  {
    type: 'function',
    function: {
      name: 'get_patient_appointments',
      description: "Get a patient's appointments (date/time, clinician, reason, status). Pass either patientId or name, not both.",
      parameters: PATIENT_ARGUMENTS,
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_details',
      description: "Get a patient's basic record (ID, name, date of birth, age, phone, email, address). Pass either patientId or name, not both.",
      parameters: PATIENT_ARGUMENTS,
    },
  },
];

function canUseTool(user, toolName) {
  return (TOOL_PERMISSIONS[toolName] || []).includes(user?.role);
}

function allowedDefinitions(user) {
  return definitions.filter((tool) => canUseTool(user, tool.function.name));
}

function parseArguments(rawArguments) {
  let args;
  try {
    args = typeof rawArguments === 'string' ? JSON.parse(rawArguments) : rawArguments;
  } catch {
    return { error: 'Tool arguments are not valid JSON' };
  }
  if (!args || typeof args !== 'object' || Array.isArray(args)) return { error: 'Tool arguments must be an object' };

  const keys = Object.keys(args);
  if (keys.length !== 1 || !['patientId', 'name'].includes(keys[0])) {
    return { error: 'Tool accepts exactly one argument: patientId or name' };
  }
  if (keys[0] === 'patientId') {
    const patientId = String(args.patientId).toUpperCase();
    return /^P-\d{4}$/.test(patientId) ? { patientId } : { error: 'patientId must look like P-0001' };
  }
  const name = typeof args.name === 'string' ? args.name.trim() : '';
  return /^[a-zA-Z .'-]{2,100}$/.test(name) ? { name } : { error: 'Patient name is not valid' };
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findPatients({ patientId, name }) {
  if (patientId) return Patient.find({ patientId }).limit(1);
  return Patient.find({ name: new RegExp(escapeRegex(name), 'i') }).sort({ patientId: 1 }).limit(5);
}

function formatDate(date, withTime) {
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(options, { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleString('en-GB', options);
}

async function appointmentsOf(patient) {
  const appointments = await Appointment.find({ patient: patient._id }).sort({ dateTime: 1 }).lean();
  return appointments.map((a) => ({ dateTime: formatDate(a.dateTime, true), clinician: a.clinician, reason: a.reason, status: a.status }));
}

function detailsOf(patient) {
  const age = Math.floor((Date.now() - patient.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
  return {
    patientId: patient.patientId,
    name: patient.name,
    dateOfBirth: formatDate(patient.dateOfBirth),
    age,
    phone: patient.phone,
    email: patient.email || null,
    address: patient.address || null,
  };
}

async function runTool(toolName, rawArguments, user) {
  if (!TOOL_PERMISSIONS[toolName]) return { error: 'Unknown tool' };
  if (!canUseTool(user, toolName)) return { error: 'You do not have permission to use this tool' };

  const args = parseArguments(rawArguments);
  if (args.error) return { error: args.error };

  const patients = await findPatients(args);
  if (patients.length === 0) return { notFound: args.patientId || args.name };
  if (patients.length > 1) return { matches: patients.map((p) => ({ patientId: p.patientId, name: p.name })) };

  const patient = patients[0];
  await logAction(user, `ai.tool.${toolName}`, patient.patientId);

  if (toolName === 'get_patient_appointments') {
    return { patientId: patient.patientId, name: patient.name, appointments: await appointmentsOf(patient) };
  }
  return { patient: detailsOf(patient) };
}

module.exports = { definitions, allowedDefinitions, canUseTool, parseArguments, runTool, TOOL_PERMISSIONS };
