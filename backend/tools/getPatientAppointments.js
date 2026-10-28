// The one tool the AI can request: look up a patient's appointments by patient ID.
// The model only ASKS for it. The backend checks the user's role, validates the arguments,
// writes an audit entry, runs one fixed read-only query, and returns only 4 safe fields.
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const { logAction } = require('../services/auditService');

const TOOL_NAME = 'get_patient_appointments';

const TOOL_PERMISSIONS = {
  [TOOL_NAME]: ['admin', 'staff'],
};

const definition = {
  type: 'function',
  function: {
    name: TOOL_NAME,
    description: "Get a patient's appointments (date/time, clinician, reason, status) using their patient ID, e.g. P-0003.",
    parameters: {
      type: 'object',
      properties: { patientId: { type: 'string', description: 'Patient ID in the format P-0000' } },
      required: ['patientId'],
      additionalProperties: false,
    },
  },
};

function canUseTool(user, toolName = TOOL_NAME) {
  return (TOOL_PERMISSIONS[toolName] || []).includes(user?.role);
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
  if (keys.length !== 1 || keys[0] !== 'patientId') return { error: 'Tool accepts exactly one argument: patientId' };
  if (typeof args.patientId !== 'string' || !/^P-\d{4}$/.test(args.patientId)) {
    return { error: 'patientId must look like P-0001' };
  }
  return { patientId: args.patientId };
}

function formatDateTime(date) {
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function runTool(toolName, rawArguments, user) {
  if (toolName !== TOOL_NAME) return { error: 'Unknown tool' };
  if (!canUseTool(user, toolName)) return { error: 'You do not have permission to look up appointments' };

  const { patientId, error } = parseArguments(rawArguments);
  if (error) return { error };

  await logAction(user, `ai.tool.${TOOL_NAME}`, patientId);

  const patient = await Patient.findOne({ patientId });
  if (!patient) return { patientId, patientFound: false, appointments: [] };

  const appointments = await Appointment.find({ patient: patient._id }).sort({ dateTime: 1 }).lean();
  return {
    patientId,
    patientFound: true,
    appointments: appointments.map((a) => ({
      dateTime: formatDateTime(a.dateTime),
      clinician: a.clinician,
      reason: a.reason,
      status: a.status,
    })),
  };
}

module.exports = { definition, runTool, canUseTool, parseArguments, TOOL_NAME, TOOL_PERMISSIONS };
