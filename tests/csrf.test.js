/**
 * CSRF defense tests: cookie-authenticated mutations require a
 * same-origin Origin/Referer and a JSON content type.
 */

const request = require('supertest');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');

let app;
let server;
let host;

beforeAll(async () => {
    await connectTestDB();
    app = require('../server/app')();
    server = app.listen(0);
    host = `127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
    await clearTestDB();
});

afterAll(async () => {
    await server.close();
    await disconnectTestDB();
});

async function loginWithCookie() {
    const User = require('../server/models/User');
    await User.create({
        name: 'Demo Farmer',
        email: 'farmer@example.com',
        password: 'secret123',
        role: 'farmer',
        isActive: true
    });
    const login = await request(server)
        .post('/api/auth/login')
        .send({ email: 'farmer@example.com', password: 'secret123' });
    return login.headers['set-cookie'][0].split(';')[0];
}

function cookieRequest(cookie, { origin, referer, contentType, rawBody } = {}) {
    let req = request(server).post('/api/payment/request');
    if (cookie) req = req.set('Cookie', cookie);
    if (origin) req = req.set('Origin', origin);
    if (referer) req = req.set('Referer', referer);
    if (contentType) req = req.set('Content-Type', contentType);
    // Use a raw body so we fully control the content-type sent.
    const body = rawBody || JSON.stringify({ plan: 'starter', phone: '0712345678' });
    req = req.send(body);
    return req;
}

describe('CSRF protection for cookie-authenticated mutations', () => {
    test('same-origin JSON mutation using the cookie is allowed', async () => {
        const cookie = await loginWithCookie();
        const res = await cookieRequest(cookie, {
            origin: `http://${host}`,
            contentType: 'application/json'
        });
        expect(res.status).toBe(201);
        expect(res.body.message).not.toContain('CSRF');
    });

    test('cross-site Origin is rejected', async () => {
        const cookie = await loginWithCookie();
        const res = await cookieRequest(cookie, {
            origin: 'https://evil.example.com',
            contentType: 'application/json'
        });
        expect(res.status).toBe(403);
        expect(res.body.message).toContain('CSRF');
    });

    test('cross-site Referer (without Origin) is rejected', async () => {
        const cookie = await loginWithCookie();
        const res = await cookieRequest(cookie, {
            referer: 'https://evil.example.com/steal.html',
            contentType: 'application/json'
        });
        expect(res.status).toBe(403);
        expect(res.body.message).toContain('CSRF');
    });

    test('classic urlencoded form submission is rejected', async () => {
        const cookie = await loginWithCookie();
        const res = await cookieRequest(cookie, {
            origin: `http://${host}`,
            contentType: 'application/x-www-form-urlencoded',
            rawBody: 'plan=starter&phone=0712345678'
        });
        expect(res.status).toBe(403);
        expect(res.body.message).toContain('CSRF');
    });

    test('no Origin/Referer metadata is rejected for cookie mutations', async () => {
        const cookie = await loginWithCookie();
        const res = await cookieRequest(cookie, {
            contentType: 'application/json'
        });
        expect(res.status).toBe(403);
        expect(res.body.message).toContain('CSRF');
    });

    test('Authorization-header mutations bypass the CSRF check', async () => {
        const User = require('../server/models/User');
        await User.create({
            name: 'Demo Farmer',
            email: 'farmer@example.com',
            password: 'secret123',
            role: 'farmer',
            isActive: true
        });
        const login = await request(server)
            .post('/api/auth/login')
            .send({ email: 'farmer@example.com', password: 'secret123' });
        const token = login.body.data.token;

        const res = await request(server)
            .post('/api/payment/request')
            .set('Authorization', 'Bearer ' + token)
            .set('Content-Type', 'application/json')
            .send({ plan: 'starter', phone: '0712345678' });
        // Attacker cannot attach this header, so it is trusted.
        expect(res.status).toEqual(expect.any(Number));
        expect(res.body.message).not.toContain('CSRF');
    });
});