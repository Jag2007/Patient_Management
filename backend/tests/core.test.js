// Core API tests: login, patient create/edit/validation, appointment date rules, safe cancellation,
// permissions and the login rate limit.
// They call the real Express routes with Supertest against the test database.
const { app, request, setupTestDb, loginAs, closeTestDb } = require('./helpers');
const AuditLog = require('../models/AuditLog');

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
  });
});

describe('Audit log permissions', () => {
  test('staff get 403', async () => {
    const res = await asStaff(request(app).get('/api/audit-logs'));
    expect(res.status).toBe(403);
  });

  test('admin can read it, and it stores only the patient ID', async () => {
    const res = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(Object.keys(res.body[0])).not.toContain('name');
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
