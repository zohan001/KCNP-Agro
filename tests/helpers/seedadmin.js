/** Boot a real Mongo + seeded admin for browser smoke tests. */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

async function boot({ port = 3996 } = {}) {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'browser-smoke-secret-000000';
    process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'browser-smoke-session-000000';
    process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '4.4.14';

    const mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri('kcnp'));
    const User = require('../../server/models/User');
    await User.create({
        name: 'KCNP Admin', email: 'admin@kcnpagro.org',
        password: 'adminpass123', role: 'admin', isActive: true
    });
    const createApp = require('../../server/app');
    const app = createApp();
    const server = app.listen(port);
    return { mongod, mongoose, server, port, close: async () => {
        await new Promise(r => server.close(r));
        await mongoose.disconnect();
        await mongod.stop();
    } };
}
module.exports = { boot };
