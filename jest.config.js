/**
 * ============================================
 * Jest Configuration
 * ============================================
 * Unit + integration tests run against an in-memory
 * MongoDB (mongodb-memory-server) so no real database
 * or network access is required.
 * ============================================
 */

module.exports = {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    setupFiles: ['<rootDir>/tests/setup.js'],
    testTimeout: 120000,
    clearMocks: true
};