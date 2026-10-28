// The patient tools the AI can ask for. The model only asks: runTool checks the role and arguments,
// finds the patient, writes an audit entry and runs one fixed read-only query.
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const escapeRegex = require('../utils/escapeRegex');
const { logAction } = require('../services/auditService');

const NO_APPOINTMENTS = 'No appointments found for that patient.';

function formatDate(date, withTime) {
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(options, { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleString('en-GB', options);
}

const TOOLS = {
  get_patient_appointments: {
    roles: ['admin', 'staff'],
    description: "Get a patient's appointments (date/time, clinician, reason, status). Pass either patientId or name, not both.",
    sourceLabel: 'Appointment records',
    async run(patient) {
      const appointments = await Appointment.find({ patient: patient._id }).sort({ dateTime: 1 }).lean();
      return {
        patientId: patient.patientId,
        name: patient.name,
        appointments: appointments.map((a) => ({
          dateTime: formatDate(a.dateTime, true),
          clinician: a.clinician,
          reason: a.reason,
          status: a.status,
        })),
      };
    },
    emptyReply: (data) => (data.appointments.length === 0 ? NO_APPOINTMENTS : null),
  },

  get_patient_details: {
    roles: ['admin', 'staff'],
    description: "Get a patient's basic record (ID, name, date of birth, age, phone, email, address). Pass either patientId or name, not both.",
    sourceLabel: 'Patient record',
    async run(patient) {
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
    },
    emptyReply: () => null,
  },
};

const PATIENT_ARGUMENTS = {
  type: 'object',
  properties: {
    patientId: { type: 'string', description: 'Patient ID in the format P-0000' },
    name: { type: 'string', description: 'Patient name, used only when no patient ID is given' },
  },
  additionalProperties: false,
};

function canUseTool(user, toolName) {
  return Boolean(TOOLS[toolName]?.roles.includes(user?.role));
}

function allowedDefinitions(user) {
  return Object.entries(TOOLS)
    .filter(([name]) => canUseTool(user, name))
    .map(([name, tool]) => ({ type: 'function', function: { name, description: tool.description, parameters: PATIENT_ARGUMENTS } }));
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

async function findPatients({ patientId, name }) {
  if (patientId) return Patient.find({ patientId }).limit(1);
  return Patient.find({ name: new RegExp(escapeRegex(name), 'i') }).sort({ patientId: 1 }).limit(5);
}

// Returns { reply } (a fixed answer for the user, no AI needed) or { data, sourceLabel } for the AI.
async function runTool(toolName, rawArguments, user) {
  const tool = TOOLS[toolName];
  if (!tool) return { reply: 'Unknown tool' };
  if (!canUseTool(user, toolName)) return { reply: 'You do not have permission to use this tool' };

  const args = parseArguments(rawArguments);
  if (args.error) return { reply: args.error };

  const patients = await findPatients(args);
  if (patients.length === 0) return { reply: `No patient found matching "${args.patientId || args.name}".` };
  if (patients.length > 1) {
    const list = patients.map((p) => `${p.patientId} ${p.name}`).join(', ');
    return { reply: `I found more than one matching patient: ${list}. Please ask again with the patient ID.` };
  }

  const patient = patients[0];
  await logAction(user, `ai.tool.${toolName}`, patient.patientId);

  const data = await tool.run(patient);
  const emptyReply = tool.emptyReply(data);
  if (emptyReply) return { reply: emptyReply };

  return { data, sourceLabel: `${tool.sourceLabel} for ${patient.patientId} (${patient.name})` };
}

module.exports = { TOOLS, allowedDefinitions, canUseTool, parseArguments, runTool, NO_APPOINTMENTS };
