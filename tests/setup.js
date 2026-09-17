/**
 * Jest setup that runs before every test file.
 * Forces the test environment so config resolves the
 * development-safe defaults (no CSRF-host surprises,
 * cookies not forced over https, CORS stays permissive),
 * even on CI.
 */

process.env.NODE_ENV = 'test';

// Keep test output readable — consumers of console.error are the app's own
// logging paths, which we redirect to the ErrorLog collection anyway.