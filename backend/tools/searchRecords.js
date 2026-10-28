// The search_records tool: the AI builds its own query for lists and counts across patients or appointments.
// It can only fill in the filters listed below; every value is checked here and the MongoDB query is built by us, read-only.
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const escapeRegex = require('../utils/escapeRegex');
const formatDate = require('../utils/formatDate');

const MAX_RESULTS = 20;
const STATUSES = ['scheduled', 'completed', 'cancelled'];

// Allowed filters per collection and the kind of value each one takes.
const FILTERS = {
  patients: { name: 'text', patientId: 'patientId', city: 'text', bornAfter: 'date', bornBefore: 'date' },
  appointments: { patientId: 'patientId', clinician: 'text', reason: 'text', status: 'status', from: 'date', to: 'date' },
};

const PARAMETERS = {
  type: 'object',
  properties: {
    collection: { type: 'string', enum: Object.keys(FILTERS) },
    filters: {
      type: 'object',
      description:
        'patients: name, patientId, city, bornAfter, bornBefore. appointments: patientId, clinician, reason, status (scheduled|completed|cancelled), from, to. Dates as YYYY-MM-DD.',
      properties: {
        name: { type: 'string' },
        patientId: { type: 'string' },
        city: { type: 'string' },
        bornAfter: { type: 'string' },
        bornBefore: { type: 'string' },
        clinician: { type: 'string' },
        reason: { type: 'string' },
        status: { type: 'string', enum: STATUSES },
        from: { type: 'string' },
        to: { type: 'string' },
      },
      additionalProperties: false,
    },
    countOnly: { type: 'boolean', description: 'true to return only how many records match' },
    limit: { type: 'integer', minimum: 1, maximum: MAX_RESULTS },
  },
  required: ['collection'],
  additionalProperties: false,
};

function checkValue(kind, value) {
  if (kind === 'text') return typeof value === 'string' && /^[a-zA-Z0-9 .,'-]{1,100}$/.test(value.trim()) ? value.trim() : null;
  if (kind === 'patientId') return /^P-\d{4}$/.test(String(value).toUpperCase()) ? String(value).toUpperCase() : null;
  if (kind === 'status') return STATUSES.includes(value) ? value : null;
  const date = new Date(value);
  return typeof value === 'string' && !Number.isNaN(date.getTime()) ? date : null;
}

// Returns { collection, filters, countOnly, limit } or { error }.
function parseSearch(args) {
  const extra = Object.keys(args).filter((key) => !['collection', 'filters', 'countOnly', 'limit'].includes(key));
  if (extra.length) return { error: `Unknown search option: ${extra.join(', ')}` };
  if (!FILTERS[args.collection]) return { error: 'collection must be "patients" or "appointments"' };

  const rawFilters = args.filters ?? {};
  if (typeof rawFilters !== 'object' || Array.isArray(rawFilters)) return { error: 'filters must be an object' };
  const filters = {};
  for (const [key, value] of Object.entries(rawFilters)) {
    const kind = FILTERS[args.collection][key];
    if (!kind) return { error: `"${key}" is not a filter for ${args.collection}` };
    filters[key] = checkValue(kind, value);
    if (filters[key] === null) return { error: `"${key}" has an invalid value` };
  }

  const limit = args.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RESULTS) return { error: `limit must be between 1 and ${MAX_RESULTS}` };
  if (args.countOnly !== undefined && typeof args.countOnly !== 'boolean') return { error: 'countOnly must be true or false' };

  return { collection: args.collection, filters, countOnly: Boolean(args.countOnly), limit };
}

const contains = (text) => new RegExp(escapeRegex(text), 'i');

// "to" and "bornBefore" include the whole of that day.
function dateRange(after, before) {
  const range = {};
  if (after) range.$gte = after;
  if (before) range.$lte = new Date(before.getTime() + 24 * 60 * 60 * 1000 - 1);
  return range;
}

async function buildQuery({ collection, filters: f }) {
  const query = {};
  if (collection === 'patients') {
    if (f.name) query.name = contains(f.name);
    if (f.patientId) query.patientId = f.patientId;
    if (f.city) query.address = contains(f.city);
    if (f.bornAfter || f.bornBefore) query.dateOfBirth = dateRange(f.bornAfter, f.bornBefore);
    return query;
  }
  if (f.patientId) query.patient = (await Patient.findOne({ patientId: f.patientId }, '_id').lean())?._id ?? null;
  if (f.clinician) query.clinician = contains(f.clinician);
  if (f.reason) query.reason = contains(f.reason);
  if (f.status) query.status = f.status;
  if (f.from || f.to) query.dateTime = dateRange(f.from, f.to);
  return query;
}

// Only non-sensitive fields come back. Phone, email and address need get_patient_details (one audited patient at a time).
const SHAPES = {
  patients: {
    model: Patient,
    sort: { patientId: 1 },
    toResult: (p) => ({ patientId: p.patientId, name: p.name, age: Math.floor((Date.now() - p.dateOfBirth) / 31557600000), city: p.address?.split(',').pop().trim() || null }),
  },
  appointments: {
    model: Appointment,
    sort: { dateTime: 1 },
    toResult: (a) => ({ dateTime: formatDate(a.dateTime, true), patientId: a.patient?.patientId, patient: a.patient?.name, clinician: a.clinician, reason: a.reason, status: a.status }),
  },
};

async function run(search) {
  const shape = SHAPES[search.collection];
  const query = await buildQuery(search);
  const total = await shape.model.countDocuments(query);
  const summary = { collection: search.collection, filters: search.filters, total };
  if (search.countOnly) return summary;

  let find = shape.model.find(query).sort(shape.sort).limit(search.limit).lean();
  if (search.collection === 'appointments') find = find.populate('patient', 'patientId name');
  const records = await find;
  return { ...summary, showing: records.length, results: records.map(shape.toResult) };
}

function sourceLabel({ collection, filters }) {
  const parts = Object.entries(filters).map(([key, value]) => `${key}: ${value instanceof Date ? formatDate(value) : value}`);
  return `Search of ${collection}${parts.length ? ` (${parts.join(', ')})` : ''}`;
}

module.exports = {
  roles: ['admin', 'staff'],
  description:
    'Search or count patients or appointments with filters, for questions about many records (e.g. "how many scheduled appointments does Dr. Kavya Iyer have", "patients in Bangalore born before 1960"). Returns at most 20 records and the total.',
  parameters: PARAMETERS,
  parseArguments: parseSearch,
  run,
  sourceLabel,
  MAX_RESULTS,
};
