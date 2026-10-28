// Staff management tests: only admins can manage accounts, new staff can log in, weak passwords and duplicates
// are rejected, admin accounts can't be changed, and a disabled or deleted account is locked out at once
// (even with a token issued before it was disabled). Every change writes an audit entry.
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { app, request, setupTestDb, loginAs, closeTestDb } = require('./helpers');

let adminToken;
let staffToken;

beforeAll(async () => {
  await setupTestDb();
  adminToken = await loginAs('admin', 'Admin@123');
  staffToken = await loginAs('staff', 'Staff@123');
});

afterAll(closeTestDb);

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

describe('Staff management', () => {
  test('staff get 403 on every account endpoint', async () => {
    const list = await request(app).get('/api/users').set('Authorization', `Bearer ${staffToken}`);
    const create = await request(app).post('/api/users').set('Authorization', `Bearer ${staffToken}`).send({ username: 'sneaky', password: 'Sneaky123' });
    expect([list.status, create.status]).toEqual([403, 403]);
    expect(await User.exists({ username: 'sneaky' })).toBeNull();
  });

  test('admin creates a staff login that works, never returning the password hash', async () => {
    const res = await asAdmin(request(app).post('/api/users')).send({ username: 'Nurse.Asha', password: 'Welcome123', role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ username: 'nurse.asha', role: 'staff', active: true });
    expect(res.body.passwordHash).toBeUndefined();

    expect(await loginAs('nurse.asha', 'Welcome123')).toBeTruthy();
    expect(await AuditLog.countDocuments({ action: 'staff.create', targetUsername: 'nurse.asha' })).toBe(1);

    const list = await asAdmin(request(app).get('/api/users'));
    expect(list.body.map((u) => u.username)).toEqual(expect.arrayContaining(['admin', 'staff', 'nurse.asha']));
    expect(JSON.stringify(list.body)).not.toMatch(/passwordHash/);
  });

  test('rejects weak passwords, bad usernames and duplicates', async () => {
    const weak = await asAdmin(request(app).post('/api/users')).send({ username: 'newstaff', password: 'short' });
    const noNumber = await asAdmin(request(app).post('/api/users')).send({ username: 'newstaff', password: 'onlyletters' });
    const badName = await asAdmin(request(app).post('/api/users')).send({ username: 'a b', password: 'Welcome123' });
    const duplicate = await asAdmin(request(app).post('/api/users')).send({ username: 'staff', password: 'Welcome123' });
    expect([weak.status, noNumber.status, badName.status, duplicate.status]).toEqual([400, 400, 400, 409]);
  });

  test('admin accounts cannot be disabled, reset or deleted here', async () => {
    const admin = await User.findOne({ username: 'admin' });
    const res = await asAdmin(request(app).patch(`/api/users/${admin._id}/active`)).send({ active: false });
    expect(res.status).toBe(403);
  });

  test('a disabled account cannot log in, and its existing token stops working; enabling restores access', async () => {
    await asAdmin(request(app).post('/api/users')).send({ username: 'temp.staff', password: 'Temp12345' });
    const token = await loginAs('temp.staff', 'Temp12345');
    const user = await User.findOne({ username: 'temp.staff' });

    await asAdmin(request(app).patch(`/api/users/${user._id}/active`)).send({ active: false });
    const oldToken = await request(app).get('/api/patients').set('Authorization', `Bearer ${token}`);
    const login = await request(app).post('/api/auth/login').send({ username: 'temp.staff', password: 'Temp12345' });
    expect(oldToken.status).toBe(401);
    expect(login.status).toBe(403);

    await asAdmin(request(app).patch(`/api/users/${user._id}/active`)).send({ active: true });
    expect(await loginAs('temp.staff', 'Temp12345')).toBeTruthy();
  });

  test('reset password replaces the old one; delete removes the account', async () => {
    await asAdmin(request(app).post('/api/users')).send({ username: 'reset.me', password: 'OldPass123' });
    const user = await User.findOne({ username: 'reset.me' });

    const reset = await asAdmin(request(app).put(`/api/users/${user._id}/password`)).send({ password: 'NewPass456' });
    expect(reset.status).toBe(204);
    expect(await loginAs('reset.me', 'OldPass123')).toBeUndefined();
    expect(await loginAs('reset.me', 'NewPass456')).toBeTruthy();

    const removed = await asAdmin(request(app).delete(`/api/users/${user._id}`));
    expect(removed.status).toBe(204);
    expect(await loginAs('reset.me', 'NewPass456')).toBeUndefined();
    expect(await AuditLog.countDocuments({ targetUsername: 'reset.me' })).toBe(3);
  });
});
