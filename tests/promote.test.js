const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { execSync } = require('child_process');
const path = require('path');

let mongod, uri;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri('verdant');
    await mongoose.connect(uri);
    const User = require('../server/models/User');
    await User.create({ name:'Demo Farmer', email:'farmer@example.com', password:'Secret123!', role:'farmer', isActive:true });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

test('promote-admin.js flips a farmer to admin and activates', async () => {
    const User = require('../server/models/User');
    const before = await User.findOne({ email:'farmer@example.com' });
    expect(before.role).toBe('farmer');
    expect(before.isRoot).toBeFalsy();

    const script = path.join(__dirname, '..', 'scripts', 'promote-admin.js');
    const out = execSync(`node "${script}" farmer@example.com`, {
        env: { ...process.env, MONGO_URI: uri }, encoding:'utf8'
    }).trim();
    expect(out).toContain('super admin');

    const after = await User.findOne({ email:'farmer@example.com' });
    expect(after.role).toBe('admin');
    expect(after.isRoot).toBe(true);
    expect(after.isActive).toBe(true);
});

test('promote-admin.js refuses a second admin while one exists', async () => {
    const User = require('../server/models/User');
    await User.create({ name:'Second', email:'second@example.com', password:'Secret123!', role:'farmer', isActive:true });

    const script = path.join(__dirname, '..', 'scripts', 'promote-admin.js');
    let out = '';
    try {
        out = execSync(`node "${script}" second@example.com`, {
            env: { ...process.env, MONGO_URI: uri }, encoding:'utf8'
        }).trim();
    } catch (e) {
        out = String(e.stdout || '') + String(e.stderr || '');
    }
    expect(out).toContain('only one super admin is allowed');

    const stillFarmer = await User.findOne({ email:'second@example.com' });
    expect(stillFarmer.role).toBe('farmer');
    expect(stillFarmer.isRoot).toBe(false);
});

test('promote-admin.js --force transfers the root role', async () => {
    const User = require('../server/models/User');
    const script = path.join(__dirname, '..', 'scripts', 'promote-admin.js');
    const out = execSync(`node "${script}" second@example.com --force`, {
        env: { ...process.env, MONGO_URI: uri }, encoding:'utf8'
    }).trim();
    expect(out).toContain('super admin');

    const newRoot = await User.findOne({ email:'second@example.com' });
    expect(newRoot.role).toBe('admin');
    expect(newRoot.isRoot).toBe(true);

    const oldRoot = await User.findOne({ email:'farmer@example.com' });
    expect(oldRoot.role).toBe('farmer');
    expect(oldRoot.isRoot).toBe(false);
});

test('promote-admin.js reports a missing user', async () => {
    const script = path.join(__dirname, '..', 'scripts', 'promote-admin.js');
    let out = '';
    try {
        execSync(`node "${script}" nobody@example.com`, {
            env: { ...process.env, MONGO_URI: uri }, encoding:'utf8'
        });
    } catch (e) {
        out = String(e.stdout || '') + String(e.stderr || '');
    }
    expect(out).toContain('No user found');
});
