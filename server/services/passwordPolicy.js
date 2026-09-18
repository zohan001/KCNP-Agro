/**
 * ============================================
 * Password Policy
 * ============================================
 * Single source of truth for password rules
 * used by registration and password reset.
 * Requires a minimum length and a mixture of
 * character classes.
 * ============================================
 */

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

/**
 * Return the list of unmet password requirements.
 * An empty array means the password satisfies the policy.
 *
 * @param {string} password
 * @returns {string[]} Human-readable problem messages.
 */
function passwordProblems(password) {
    if (typeof password !== 'string' || password.length === 0) {
        return ['Password is required.'];
    }

    const problems = [];

    if (password.length < MIN_LENGTH) {
        problems.push(`Password must be at least ${MIN_LENGTH} characters.`);
    }
    if (password.length > MAX_LENGTH) {
        problems.push(`Password cannot exceed ${MAX_LENGTH} characters.`);
    }
    if (!/[a-z]/.test(password)) {
        problems.push('Password must include a lowercase letter.');
    }
    if (!/[A-Z]/.test(password)) {
        problems.push('Password must include an uppercase letter.');
    }
    if (!/[0-9]/.test(password)) {
        problems.push('Password must include a number.');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        problems.push('Password must include a special character (e.g. !@#$%^&*).');
    }

    return problems;
}

/**
 * @param {string} password
 * @returns {boolean} True when the password satisfies the policy.
 */
function isStrongPassword(password) {
    return passwordProblems(password).length === 0;
}

module.exports = { MIN_LENGTH, MAX_LENGTH, passwordProblems, isStrongPassword };
