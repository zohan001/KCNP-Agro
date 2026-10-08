/**
 * Registration captcha middleware: Google refusing a token must not lock a
 * real person out of the platform, only the honeypot/timing heuristics may.
 */

const config = require('../server/config');
const { requireRecaptcha, passesHeuristicChecks } = require('../server/services/recaptcha');

const originalFetch = global.fetch;
let savedKeys;

beforeEach(() => {
    savedKeys = { siteKey: config.recaptcha.siteKey, secretKey: config.recaptcha.secretKey };
    config.recaptcha.siteKey = 'test-site-key';
    config.recaptcha.secretKey = 'test-secret-key';
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    config.recaptcha.siteKey = savedKeys.siteKey;
    config.recaptcha.secretKey = savedKeys.secretKey;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
});

/** Google answers siteverify with whatever `payload` we hand back. */
function googleAnswers(payload) {
    global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve(payload) });
}

/** Runs the middleware and resolves with its outcome. */
function run(body) {
    return new Promise(resolve => {
        const req = { body, ip: '203.0.113.9' };
        const res = {
            code: null,
            status(c) { this.code = c; return this; },
            json(payload) { resolve({ allowed: false, code: this.code, payload }); }
        };
        requireRecaptcha(req, res, () => resolve({ allowed: true }));
    });
}

const slowForm = () => ({ formStartedAt: Date.now() - 5000 });
const fastForm = () => ({ formStartedAt: Date.now() });

describe('passesHeuristicChecks', () => {
    test('accepts a form that was filled at a human pace', () => {
        expect(passesHeuristicChecks({ body: slowForm() })).toEqual({ ok: true });
    });

    test('rejects a honeypot field that only a bot fills', () => {
        expect(passesHeuristicChecks({ body: { ...slowForm(), website: 'http://spam' } }))
            .toEqual({ ok: false, reason: 'honeypot' });
    });

    test('rejects an instant submission', () => {
        expect(passesHeuristicChecks({ body: fastForm() })).toEqual({ ok: false, reason: 'too-fast' });
    });

    test('rejects a timestamp stamped in the future', () => {
        expect(passesHeuristicChecks({ body: { formStartedAt: Date.now() + 10 * 60 * 1000 } }))
            .toEqual({ ok: false, reason: 'bad-timestamp' });
    });
});

describe('requireRecaptcha', () => {
    test('passes a token Google accepts without further checks', async () => {
        googleAnswers({ success: true, hostname: 'verdant-agro.onrender.com' });
        const out = await run({ ...fastForm(), recaptchaToken: 'good-token' });
        expect(out.allowed).toBe(true);
    });

    test('still allows registration when Google refuses the token but the form looks human', async () => {
        googleAnswers({ success: false, 'error-codes': ['invalid-input-response'], hostname: 'verdant-agro.onrender.com' });
        const out = await run({ ...slowForm(), recaptchaToken: 'rejected-token' });
        expect(out.allowed).toBe(true);
    });

    test('rejects a refused token that also trips a heuristic', async () => {
        googleAnswers({ success: false, 'error-codes': ['invalid-input-secret'] });
        const out = await run({ ...slowForm(), website: 'http://spam', recaptchaToken: 'rejected-token' });
        expect(out.allowed).toBe(false);
        expect(out.code).toBe(400);
        expect(out.payload.message).toMatch(/flagged as automated/i);
    });

    test('falls back to the heuristics when siteverify itself fails', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
        const out = await run({ ...slowForm(), recaptchaToken: 'any-token' });
        expect(out.allowed).toBe(true);
    });

    test('allows a token-less submission that looks human without calling Google', async () => {
        global.fetch = jest.fn();
        const out = await run({ ...slowForm(), recaptchaToken: '' });
        expect(out.allowed).toBe(true);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('blocks a token-less submission that trips a heuristic', async () => {
        const out = await run({ ...fastForm(), recaptchaToken: '' });
        expect(out.allowed).toBe(false);
        expect(out.code).toBe(400);
        expect(out.payload.message).toMatch(/flagged as automated/i);
    });

    test('does nothing at all when no keys are configured', async () => {
        config.recaptcha.siteKey = '';
        config.recaptcha.secretKey = '';
        global.fetch = jest.fn();
        const out = await run({ ...fastForm(), recaptchaToken: 'anything' });
        expect(out.allowed).toBe(true);
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
