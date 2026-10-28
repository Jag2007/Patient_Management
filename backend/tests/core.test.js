// Core API tests with Supertest: login, patients, appointments, permissions, documents and the login rate limit.
const { app, request, setupTestDb, loginAs, closeTestDb } = require('./helpers');
const AuditLog = require('../models/AuditLog');
const FaqSection = require('../models/FaqSection');
const judgeService = require('../services/judgeService');

const DAY = 24 * 60 * 60 * 1000;
let staffToken;
let adminToken;

beforeAll(async () => {
  await setupTestDb();
  staffToken = await loginAs('staff', 'Staff@123');
  adminToken = await loginAs('admin', 'Admin@123');
});

afterAll(closeTestDb);

function asStaff(req) {
  return req.set('Authorization', `Bearer ${staffToken}`);
}

async function createPatient() {
  const res = await asStaff(request(app).post('/api/patients')).send({
    name: 'Test Patient',
    dateOfBirth: '1990-01-01',
    phone: '9876543210',
  });
  return res.body;
}

function appointmentFor(patientId, dateTime) {
  return { patientId, dateTime, clinician: 'Dr. Test', reason: 'Check-up' };
}

describe('Auth', () => {
  test('logs in with correct credentials and returns a token and role', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'staff', password: 'Staff@123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ username: 'staff', role: 'staff' });
  });

  test('rejects requests without a token', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  test('gives the same error for wrong username and wrong password', async () => {
    const wrongUser = await request(app).post('/api/auth/login').send({ username: 'nobody', password: 'x' });
    const wrongPass = await request(app).post('/api/auth/login').send({ username: 'staff', password: 'x' });
    expect(wrongUser.status).toBe(401);
    expect(wrongUser.body.error).toBe(wrongPass.body.error);
  });
});

describe('Patients', () => {
  test('creates a patient with an auto-generated ID', async () => {
    const patient = await createPatient();
    expect(patient.patientId).toMatch(/^P-\d{4}$/);
  });

  test('rejects invalid patient data with a message per field', async () => {
    const res = await asStaff(request(app).post('/api/patients')).send({
      dateOfBirth: '2999-01-01',
      phone: '123',
      email: 'not-an-email',
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual(expect.arrayContaining(['name', 'dateOfBirth', 'phone', 'email']));
  });

  test('edits a patient, ignores fields that are not editable, and writes an audit entry', async () => {
    const patient = await createPatient();
    const res = await asStaff(request(app).put(`/api/patients/${patient.patientId}`)).send({
      address: '12 MG Road',
      patientId: 'P-9999',
    });
    expect(res.status).toBe(200);
    expect(res.body.address).toBe('12 MG Road');
    expect(res.body.patientId).toBe(patient.patientId);
    expect(await AuditLog.exists({ action: 'patient.update', patientId: patient.patientId })).toBeTruthy();
  });
});

describe('Appointments', () => {
  test('rejects an appointment in the past', async () => {
    const patient = await createPatient();
    const res = await asStaff(request(app).post('/api/appointments')).send(
      appointmentFor(patient.patientId, new Date(Date.now() - DAY).toISOString())
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/past/);
  });

  test('rejects an appointment more than one year ahead', async () => {
    const patient = await createPatient();
    const res = await asStaff(request(app).post('/api/appointments')).send(
      appointmentFor(patient.patientId, new Date(Date.now() + 400 * DAY).toISOString())
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/one year/);
  });

  test('cancelling the same appointment twice fails the second time', async () => {
    const patient = await createPatient();
    const created = await asStaff(request(app).post('/api/appointments')).send(
      appointmentFor(patient.patientId, new Date(Date.now() + 7 * DAY).toISOString())
    );
    expect(created.status).toBe(201);

    const first = await asStaff(request(app).patch(`/api/appointments/${created.body._id}/cancel`));
    const second = await asStaff(request(app).patch(`/api/appointments/${created.body._id}/cancel`));
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('cancelled');
    expect(second.status).toBe(409);
    expect(await AuditLog.countDocuments({ action: 'appointment.cancel', patientId: patient.patientId })).toBe(1);
  });

  test('edits clinician and reason, ignores the patient and status, and writes an audit entry', async () => {
    const patient = await createPatient();
    const created = await asStaff(request(app).post('/api/appointments')).send(
      appointmentFor(patient.patientId, new Date(Date.now() + 7 * DAY).toISOString())
    );

    const res = await asStaff(request(app).put(`/api/appointments/${created.body._id}`)).send({
      clinician: 'Dr. New',
      reason: 'Follow-up',
      status: 'completed',
      patient: '000000000000000000000000',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ clinician: 'Dr. New', reason: 'Follow-up', status: 'scheduled' });
    expect(res.body.patient.patientId).toBe(patient.patientId);
    expect(await AuditLog.countDocuments({ action: 'appointment.update', patientId: patient.patientId })).toBe(1);
  });

  test('rejects an edit to a past date, an empty edit, and editing a cancelled appointment', async () => {
    const patient = await createPatient();
    const created = await asStaff(request(app).post('/api/appointments')).send(
      appointmentFor(patient.patientId, new Date(Date.now() + 7 * DAY).toISOString())
    );
    const url = `/api/appointments/${created.body._id}`;

    const pastDate = await asStaff(request(app).put(url)).send({ dateTime: new Date(Date.now() - DAY).toISOString() });
    expect(pastDate.status).toBe(400);
    const empty = await asStaff(request(app).put(url)).send({});
    expect(empty.status).toBe(400);

    await asStaff(request(app).patch(`${url}/cancel`));
    const afterCancel = await asStaff(request(app).put(url)).send({ reason: 'Too late' });
    expect(afterCancel.status).toBe(409);
  });

  test('an unknown appointment ID gets 404, a malformed one 400', async () => {
    const unknown = '000000000000000000000000';
    const edit = await asStaff(request(app).put(`/api/appointments/${unknown}`)).send({ reason: 'x' });
    const cancel = await asStaff(request(app).patch(`/api/appointments/${unknown}/cancel`));
    expect([edit.status, edit.body.error, cancel.status]).toEqual([404, 'Appointment not found', 404]);
    expect((await asStaff(request(app).patch('/api/appointments/123/cancel'))).body.error).toBe('Invalid ID');
  });

  test('a body over 10 KB gets a clean 413 message', async () => {
    const res = await asStaff(request(app).post('/api/patients')).send({ name: 'x'.repeat(20000) });
    expect([res.status, res.body.error]).toEqual([413, 'Request is too large']);
  });
});

describe('Audit log permissions', () => {
  test('staff get 403', async () => {
    const res = await asStaff(request(app).get('/api/audit-logs'));
    expect(res.status).toBe(403);
  });

  test('admin can read it; names are added for display but only the patient ID is stored', async () => {
    const res = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].patientName).toBe('Test Patient');

    const stored = await AuditLog.findOne().lean();
    expect(Object.keys(stored).sort()).toEqual(['__v', '_id', 'action', 'createdAt', 'patientId', 'username']);
  });
});

describe('Documents', () => {
  test('admin sees the AI documents grouped by file, staff get 403', async () => {
    await FaqSection.create([
      { source: 'billing.md', section: 2, text: 'Billing and Payments: Patients can pay with UPI.' },
      { source: 'billing.md', section: 1, text: 'Billing and Payments: A consultation costs 500 rupees.' },
    ]);

    const staffRes = await asStaff(request(app).get('/api/documents'));
    expect(staffRes.status).toBe(403);

    const res = await request(app).get('/api/documents').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        source: 'billing.md',
        title: 'Billing and Payments',
        sections: [
          { section: 1, text: 'A consultation costs 500 rupees.' },
          { section: 2, text: 'Patients can pay with UPI.' },
        ],
      },
    ]);
  });
});

describe('Login rate limit', () => {
  test('blocks an IP after too many failed logins', async () => {
    const statuses = [];
    for (let attempt = 0; attempt < 12; attempt++) {
      const res = await request(app).post('/api/auth/login').send({ username: 'staff', password: 'wrong' });
      statuses.push(res.status);
    }
    expect(statuses).toContain(401);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('LLM judge verdict parsing', () => {
  test('reads a valid verdict and rejects anything else', () => {
    expect(judgeService.parseVerdict('{"answers_question": true, "grounded": false, "reason": "x"}')).toMatchObject({ grounded: false });
    expect(judgeService.parseVerdict('Looks fine to me')).toBeNull();
    expect(judgeService.parseVerdict('{"grounded": "yes"}')).toBeNull();
  });
});

describe('LLM error recovery', () => {
  const llmService = require('../services/llmService');
  const tools = [{ type: 'function', function: { name: 'get_patient_details' } }];
  const toolUseFailed = (generation) => ({ error: { error: { code: 'tool_use_failed', failed_generation: JSON.stringify(generation) } } });

  test('uses the reply the model wrapped in a made-up "json" tool, but never a real tool call', () => {
    const reply = { type: 'chat', answer: 'Hello!', used_source_ids: [] };
    expect(llmService.recoverReply(toolUseFailed({ name: 'json', arguments: reply }), tools)).toEqual({ role: 'assistant', content: JSON.stringify(reply) });
    expect(llmService.recoverReply(toolUseFailed({ name: 'get_patient_details', arguments: { foo: 1 } }), tools)).toBeNull();
    expect(llmService.recoverReply({ status: 500 }, tools)).toBeNull();
  });

  test('retries a rate limit only when Groq asks for a short wait', () => {
    expect(llmService.retryAfterSeconds({ headers: { 'retry-after': '6' } })).toBe(6);
    expect(llmService.retryAfterSeconds({ headers: new Headers({ 'retry-after': '3' }) })).toBe(3);
    expect(llmService.retryAfterSeconds({ headers: { 'retry-after': '60' } })).toBeNull();
    expect(llmService.retryAfterSeconds({})).toBeNull();
    expect(llmService.retryAfterSeconds({ headers: new Headers() })).toBeNull();
  });
});

describe('Streaming helpers', () => {
  const { collectStream } = require('../services/llmService');
  const createAnswerStream = require('../utils/answerStream');

  test('createAnswerStream passes on only the answer text, decoded, however the JSON is split', () => {
    const pieces = [];
    const feed = createAnswerStream((text) => pieces.push(text));
    const json = JSON.stringify({ type: 'answer', answer: 'Fee: 300 "rupees"\nPaid at the desk ✓', used_source_ids: ['S1'] });
    for (let i = 0; i < json.length; i += 2) feed(json.slice(i, i + 2));
    expect(pieces.join('')).toBe('Fee: 300 "rupees"\nPaid at the desk ✓');
  });

  test('collectStream joins text chunks and tool-call pieces back into one message', async () => {
    async function* fakeStream() {
      yield { choices: [{ delta: { content: '{"type":' } }] };
      yield { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'get_patient_details', arguments: '{"patient' } }] } }] };
      yield { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'Id":"P-0001"}' } }] } }] };
      yield { choices: [{ delta: {} }] };
    }
    const seen = [];
    const message = await collectStream(fakeStream(), (text) => seen.push(text));
    expect(seen).toEqual(['{"type":']);
    expect(message.tool_calls).toEqual([{ id: 'call_1', type: 'function', function: { name: 'get_patient_details', arguments: '{"patientId":"P-0001"}' } }]);
  });
});
