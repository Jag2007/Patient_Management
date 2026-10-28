// Refresh token tests: login sets an httpOnly cookie, refresh swaps it for a new one (the old one stops working),
// logout ends the session, and disabling an account ends all of its sessions.
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { app, request, setupTestDb, loginAs, closeTestDb } = require('./helpers');

beforeAll(setupTestDb);
afterAll(closeTestDb);

async function login(username, password) {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  const cookie = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
  return { res, cookie: cookie.split(';')[0] };
}

const refresh = (cookie) => request(app).post('/api/auth/refresh').set('Cookie', cookie);
const cookieOf = (res) => res.headers['set-cookie'].find((c) => c.startsWith('refreshToken=')).split(';')[0];

describe('Refresh tokens', () => {
  test('login returns a 15 minute access token and an httpOnly refresh cookie stored only as a hash', async () => {
    const { res, cookie } = await login('staff', 'Staff@123');
    const { exp, iat } = jwt.decode(res.body.token);
    expect(exp - iat).toBe(15 * 60);

    const raw = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    expect(raw).toMatch(/HttpOnly/);
    expect(raw).toMatch(/Path=\/api\/auth/);
    expect(await RefreshToken.exists({ tokenHash: cookie.split('=')[1] })).toBeNull();
  });

  test('refresh gives a new access token and a new cookie, and the old cookie works only once', async () => {
    const { cookie } = await login('staff', 'Staff@123');
    const first = await refresh(cookie);
    expect(first.status).toBe(200);
    expect(first.body.token).toBeTruthy();
    expect(first.body.user).toEqual({ username: 'staff', role: 'staff' });

    const reused = await refresh(cookie);
    expect(reused.status).toBe(401);
    expect((await refresh(cookieOf(first))).status).toBe(200);
  });

  test('refresh without a cookie or with a made-up one is rejected', async () => {
    expect((await request(app).post('/api/auth/refresh')).status).toBe(401);
    expect((await refresh('refreshToken=not-a-real-token')).status).toBe(401);
  });

  test('logout deletes the session, so its cookie can no longer refresh', async () => {
    const { cookie } = await login('staff', 'Staff@123');
    const out = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(204);
    expect((await refresh(cookie)).status).toBe(401);
  });

  test('disabling an account ends all of its sessions', async () => {
    const adminToken = await loginAs('admin', 'Admin@123');
    await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`).send({ username: 'two.devices', password: 'Phone1234' });
    const laptop = await login('two.devices', 'Phone1234');
    const phone = await login('two.devices', 'Phone1234');

    const user = await User.findOne({ username: 'two.devices' });
    await request(app).patch(`/api/users/${user._id}/active`).set('Authorization', `Bearer ${adminToken}`).send({ active: false });

    expect((await refresh(laptop.cookie)).status).toBe(401);
    expect((await refresh(phone.cookie)).status).toBe(401);
    expect(await RefreshToken.countDocuments({ user: user._id })).toBe(0);
  });
});
