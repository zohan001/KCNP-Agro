/**
 * Test database helper.
 *
 * Default: boots an ephemeral mongodb-memory-server (no external services,
 * ideal for CI). Override by setting TEST_MONGO_URI to point at an already
 * running mongod — useful on machines whose CPU cannot run the bundled
 * MongoDB (AVX-less), or when a dockerised MongoDB is preferred.
 */

const mongoose = require('mongoose');

let memoryServer = null;

async function connectTestDB() {
    let uri = process.env.TEST_MONGO_URI;
    if (!uri) {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        uri = memoryServer.getUri();
    }
    await mongoose.connect(uri);
    return uri;
}

async function clearTestDB() {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map(c => c.deleteMany({})));
}

async function disconnectTestDB() {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
    if (memoryServer) {
        await memoryServer.stop();
        memoryServer = null;
    }
}

module.exports = { connectTestDB, clearTestDB, disconnectTestDB };