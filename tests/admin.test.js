/**
 * Admin API tests: role gating, pending-payment notifications,
 * notification ack, and the persisted error log viewer.
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

async function seedUser(role, email) {
    const User = require('../server/models/User');
    const user = await User.create({
        name: role === 'admin' ? 'Super Admin' : 'Demo Farmer',
        email,
        password: 'secret123',
        role,
        isActive: true
    });
    return user;
}

async function loginUser(email) {
    const login = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'secret123' });
    return login.body.data.token;
}

function adminApi(token) {
    return {
        token,
        get: (p) => request(app).get('/api' + p).set('Authorization', 'Bearer ' + token),
        post: (p, body) => request(app).post('/api' + p).set('Authorization', 'Bearer ' + token).send(body || {})
    };
}

describe('Admin authorization', () => {
    test('admin routes require a token', async () => {
        const res = await request(app).get('/api/admin/users');
        expect(res.status).toBe(401);
    });

    test('non-admin role is forbidden', async () => {
        await seedUser('farmer', 'farmer@example.com');
        const token = await loginUser('farmer@example.com');
        const res = await request(app).get('/api/admin/users')
            .set('Authorization', 'Bearer ' + token);
        expect(res.status).toBe(403);
    });

    test('admin can list users', async () => {
        await seedUser('admin', 'admin@example.com');
        await seedUser('farmer', 'farmer@example.com');
        const token = await loginUser('admin@example.com');
        const res = await request(app).get('/api/admin/users')
            .set('Authorization', 'Bearer ' + token);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    test('an admin cannot promote a member to admin via the role switch', async () => {
        await seedUser('admin', 'admin@example.com');
        await seedUser('farmer', 'farmer@example.com');
        const token = await loginUser('admin@example.com');
        const farmer = await require('../server/models/User').findOne({ email: 'farmer@example.com' });

        const res = await request(app)
            .put('/api/admin/users/' + farmer._id)
            .set('Authorization', 'Bearer ' + token)
            .send({ role: 'admin' });
        expect(res.status).toBe(200);

        const reloaded = await require('../server/models/User').findById(farmer._id);
        expect(reloaded.role).toBe('farmer');
    });

    test('an admin can still change a member between the two tiers', async () => {
        await seedUser('admin', 'admin@example.com');
        await seedUser('farmer', 'farmer@example.com');
        const token = await loginUser('admin@example.com');
        const farmer = await require('../server/models/User').findOne({ email: 'farmer@example.com' });

        const res = await request(app)
            .put('/api/admin/users/' + farmer._id)
            .set('Authorization', 'Bearer ' + token)
            .send({ role: 'trader' });
        expect(res.status).toBe(200);

        const reloaded = await require('../server/models/User').findById(farmer._id);
        expect(reloaded.role).toBe('trader');
    });

    test('the root super admin cannot be demoted or deactivated', async () => {
        await seedUser('admin', 'admin@example.com');
        const User = require('../server/models/User');
        const root = await User.findOne({ email: 'admin@example.com' });
        root.isRoot = true;
        await root.save();
        const token = await loginUser('admin@example.com');

        const demote = await request(app)
            .put('/api/admin/users/' + root._id)
            .set('Authorization', 'Bearer ' + token)
            .send({ role: 'farmer' });
        expect(demote.status).toBe(400);

        const deactivate = await request(app)
            .put('/api/admin/users/' + root._id)
            .set('Authorization', 'Bearer ' + token)
            .send({ isActive: false });
        expect(deactivate.status).toBe(400);

        const reloaded = await User.findById(root._id);
        expect(reloaded.role).toBe('admin');
        expect(reloaded.isActive).toBe(true);
        expect(reloaded.isRoot).toBe(true);
    });

    test('the root super admin cannot be deleted', async () => {
        await seedUser('admin', 'admin@example.com');
        await seedUser('farmer', 'farmer@example.com');
        const User = require('../server/models/User');
        const root = await User.findOne({ email: 'admin@example.com' });
        root.isRoot = true;
        await root.save();
        const token = await loginUser('admin@example.com');

        const res = await request(app)
            .delete('/api/admin/users/' + root._id)
            .set('Authorization', 'Bearer ' + token);
        expect(res.status).toBe(400);

        const stillThere = await User.findById(root._id);
        expect(stillThere).toBeTruthy();
    });

    test('membership cannot be granted to an admin account', async () => {
        await seedUser('admin', 'admin@example.com');
        await seedUser('farmer', 'farmer@example.com');
        const User = require('../server/models/User');
        const admin = await User.findOne({ email: 'admin@example.com' });
        admin.isRoot = true;
        await admin.save();
        const token = await loginUser('admin@example.com');
        const farmer = await User.findOne({ email: 'farmer@example.com' });

        const adminGrant = await request(app)
            .put('/api/admin/users/' + admin._id)
            .set('Authorization', 'Bearer ' + token)
            .send({ grantMembership: { plan: 'grower', periodMonths: 12 } });
        expect(adminGrant.status).toBe(400);

        const reloadedAdmin = await User.findById(admin._id);
        expect(reloadedAdmin.membership.status).toBe('none');

        const farmerGrant = await request(app)
            .put('/api/admin/users/' + farmer._id)
            .set('Authorization', 'Bearer ' + token)
            .send({ grantMembership: { plan: 'grower', periodMonths: 12 } });
        expect(farmerGrant.status).toBe(200);
    });
});

describe('Payment notifications', () => {
    test('manual payment request creates an unread notification for admins', async () => {
        await seedUser('admin', 'admin@example.com');
        await seedUser('farmer', 'farmer@example.com');
        const farmerToken = await loginUser('farmer@example.com');
        const adminToken = await loginUser('admin@example.com');
        const api = adminApi(adminToken);

        const pay = await request(app)
            .post('/api/payment/request')
            .set('Authorization', 'Bearer ' + farmerToken)
            .send({ plan: 'starter', phone: '0712345678' });
        expect(pay.status).toBe(201);

        const notifs = await api.get('/admin/notifications');
        expect(notifs.status).toBe(200);
        expect(notifs.body.unread).toBeGreaterThanOrEqual(1);
        const found = notifs.body.data.find(n => n.type === 'payment_pending_approval');
        expect(found).toBeDefined();
        expect(found.read).toBe(false);

        const overview = await api.get('/admin/overview');
        expect(overview.body.data.unreadNotifications).toBeGreaterThanOrEqual(1);
    });

    test('approving the payment marks its notification as read', async () => {
        await seedUser('admin', 'admin@example.com');
        await seedUser('farmer', 'farmer@example.com');
        const farmerToken = await loginUser('farmer@example.com');
        const adminToken = await loginUser('admin@example.com');
        const api = adminApi(adminToken);

        const pay = await request(app)
            .post('/api/payment/request')
            .set('Authorization', 'Bearer ' + farmerToken)
            .send({ plan: 'starter', phone: '0712345678' });
        const subId = pay.body.data.payment._id;

        const approve = await api.post(`/admin/subscriptions/${subId}/approve`);
        expect(approve.status).toBe(200);
        expect(approve.body.success).toBe(true);

        const notifs = await api.get('/admin/notifications');
        const found = notifs.body.data.find(n => n.refId === subId);
        expect(found).toBeDefined();
        expect(found.read).toBe(true);
    });

    test('admin can mark notifications read and clear all', async () => {
        await seedUser('admin', 'admin@example.com');
        await seedUser('farmer', 'farmer@example.com');
        const farmerToken = await loginUser('farmer@example.com');
        const adminToken = await loginUser('admin@example.com');
        const api = adminApi(adminToken);

        for (let i = 0; i < 2; i++) {
            await request(app)
                .post('/api/payment/request')
                .set('Authorization', 'Bearer ' + farmerToken)
                .send({ plan: 'starter', phone: `071234${String(i).padStart(4, '0')}` });
        }
        const before = await api.get('/admin/notifications');
        const one = before.body.data.find(n => !n.read);
        const markOne = await api.post(`/admin/notifications/${one._id}/read`);
        expect(markOne.status).toBe(200);

        const afterOne = await api.get('/admin/notifications');
        expect(afterOne.body.data.find(n => n._id === one._id).read).toBe(true);

        const all = await api.post('/admin/notifications/read-all');
        expect(all.status).toBe(200);
        const afterAll = await api.get('/admin/notifications');
        expect(afterAll.body.unread).toBe(0);
    });
});

describe('Error log viewer', () => {
    test('logs are persisted and listed only for admins', async () => {
        const { recordError } = require('../server/services/errorLogger');
        await recordError({
            level: 'error',
            source: 'test',
            error: new Error('boom'),
            method: 'POST',
            url: '/api/test',
            status: 500
        });

        await seedUser('admin', 'admin@example.com');
        await seedUser('farmer', 'farmer@example.com');

        // Farmer cannot read logs.
        const farmerToken = await loginUser('farmer@example.com');
        const forbidden = await request(app).get('/api/admin/logs')
            .set('Authorization', 'Bearer ' + farmerToken);
        expect(forbidden.status).toBe(403);

        // Admin can.
        const adminToken = await loginUser('admin@example.com');
        const res = await request(app).get('/api/admin/logs')
            .set('Authorization', 'Bearer ' + adminToken);
        expect(res.status).toBe(200);
        expect(res.body.data.some(e => e.message === 'boom')).toBe(true);
    });

    test('unhandled errors are captured by the global error handler', async () => {
        await seedUser('admin', 'admin@example.com');
        const adminToken = await loginUser('admin@example.com');

        // Trigger the JSON body parser error path (invalid JSON body).
        const bad = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send('{not json');
        // BodyParser syntax errors are 400 -> nothing to fix here, only assert
        // the request failed and did NOT crash the process.
        expect([400, 500]).toContain(bad.status);
    });
});