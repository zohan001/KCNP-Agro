/**
 * Tests for JWT secret resolution: env override, development default, and
 * production auto-generation + persistence.
 */

const { connectTestDB, clearTestDB, disconnectTestDB } = require('./helpers/db');

let config;
let AppSecret;
let resolveJwtSecret;
let DEV_DEFAULT;

beforeAll(async () => {
    await connectTestDB();
    config = require('../server/config');
    AppSecret = require('../server/models/AppSecret');
    ({ resolveJwtSecret, DEV_DEFAULT } = require('../server/services/appSecret'));
});

beforeEach(async () => {
    await clearTestDB();
    config.env = 'test';
    config.jwt.secret = DEV_DEFAULT;
});

afterAll(async () => {
    await disconnectTestDB();
});

test('a configured JWT_SECRET is used as-is', async () => {
    config.jwt.secret = 'a-really-strong-env-secret';
    const result = await resolveJwtSecret();
    expect(result).toEqual({ secret: 'a-really-strong-env-secret', source: 'env' });
});

test('non-production falls back to the development default', async () => {
    const result = await resolveJwtSecret();
    expect(result.source).toBe('default');
    expect(result.secret).toBe(DEV_DEFAULT);
});

test('production generates and persists a secret that is stable across calls', async () => {
    config.env = 'production';
    config.jwt.secret = DEV_DEFAULT;

    const first = await resolveJwtSecret();
    expect(first.source).toBe('database');
    expect(first.secret).toMatch(/^[0-9a-f]{96}$/);

    const second = await resolveJwtSecret();
    expect(second.source).toBe('database');
    expect(second.secret).toBe(first.secret);

    const stored = await AppSecret.findOne({ key: 'jwt_secret' });
    expect(stored.value).toBe(first.secret);
});
