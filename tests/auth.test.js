/**
 * Auth flow tests: registration, activation, login,
 * httpOnly session cookie, and logout.
 */

const request = require('supertest');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');

let app;
let server;

beforeAll(async () => {
    await connectTestDB();
    app = require('../server/app')();
    server = app.listen(0);
});

beforeEach(async () => {
    await clearTestDB();
});

afterAll(async () => {
    await server.close();
    await disconnectTestDB();
});

async function registerUser(overrides = {}) {
    return request(app)
        .post('/api/auth/register')
        .send({
            name: 'Demo Farmer',
            email: 'farmer@example.com',
            password: 'secret123',
            role: 'farmer',
            ...overrides
        });
}

describe('Auth', () => {
    test('health endpoint reports ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe('ok');
    });

    test('unknown API route returns 404 json', async () => {
        const res = await request(app).get('/api/does-not-exist');
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });

    test('register creates an inactive account with an activation link (no SMTP configured)', async () => {
        const res = await registerUser();
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.isActive).toBe(false);
        // Email delivery is unavailable in tests, so the link must be returned.
        expect(res.body.data.activationSent).toBe(false);
        expect(res.body.data.activationLink).toContain('/activate?token=');
    });

    test('login before activation is rejected', async () => {
        await registerUser();
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'farmer@example.com', password: 'secret123' });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACTIVATION_REQUIRED');
    });

    test('activate unlocks the account', async () => {
        const reg = await registerUser();
        const token = new URL(reg.body.data.activationLink).searchParams.get('token');
        const res = await request(app)
            .post('/api/auth/activate')
            .send({ token });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('login after activation sets an httpOnly session cookie', async () => {
        const reg = await registerUser();
        const actToken = new URL(reg.body.data.activationLink).searchParams.get('token');
        await request(app).post('/api/auth/activate').send({ token: actToken });

        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: 'farmer@example.com', password: 'secret123' });

        expect(login.status).toBe(200);
        expect(login.body.success).toBe(true);
        expect(login.headers['set-cookie']).toBeDefined();

        const cookie = login.headers['set-cookie'].find(c => c.startsWith('kcnp_session='));
        expect(cookie).toBeDefined();
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('SameSite=Lax');
        expect(cookie).not.toContain('Secure'); // dev/test http transport
    });

    test('profile loads with the Authorization header', async () => {
        await registerActive();
        const login = await loginAs('farmer@example.com');
        const res = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${login.body.data.token}`);
        expect(res.status).toBe(200);
        expect(res.body.data.user.email).toBe('farmer@example.com');
    });

    test('profile loads using ONLY the httpOnly cookie', async () => {
        await registerActive();
        const login = await loginAs('farmer@example.com');
        const cookie = login.headers['set-cookie'][0].split(';')[0];
        const res = await request(app)
            .get('/api/auth/profile')
            .set('Cookie', cookie);
        expect(res.status).toBe(200);
        expect(res.body.data.user.email).toBe('farmer@example.com');
    });

    test('invalid token is rejected', async () => {
        const res = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', 'Bearer not.a.real.token');
        expect(res.status).toBe(401);
    });

    test('missing credentials are rejected', async () => {
        const res = await request(app).get('/api/auth/profile');
        expect(res.status).toBe(401);
    });

    test('logout clears the session cookie', async () => {
        await registerActive();
        const login = await loginAs('farmer@example.com');
        const cookie = login.headers['set-cookie'][0].split(';')[0];

        const logout = await request(app)
            .post('/api/auth/logout')
            .set('Cookie', cookie);
        expect(logout.status).toBe(200);
        const cleared = logout.headers['set-cookie'].find(c => c.startsWith('kcnp_session='));
        expect(cleared).toContain('kcnp_session=');
        // The browser is told to drop the cookie immediately.
        expect(cleared).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
    });
});

async function registerActive() {
    const reg = await registerUser();
    const token = new URL(reg.body.data.activationLink).searchParams.get('token');
    await request(app).post('/api/auth/activate').send({ token });
}

async function loginAs(email) {
    return request(app)
        .post('/api/auth/login')
        .send({ email, password: 'secret123' });
}