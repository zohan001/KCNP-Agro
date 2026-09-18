/**
 * Unit tests for the shared password policy.
 */

const { passwordProblems, isStrongPassword, MIN_LENGTH } = require('../server/services/passwordPolicy');

describe('passwordPolicy', () => {
    test('accepts a password with length and all character classes', () => {
        expect(isStrongPassword('Str0ng!Pass')).toBe(true);
        expect(passwordProblems('Str0ng!Pass')).toEqual([]);
    });

    test('rejects empty and non-string values as required', () => {
        expect(passwordProblems('')).toEqual(['Password is required.']);
        expect(passwordProblems(undefined)).toEqual(['Password is required.']);
    });

    test('flags a password that is too short', () => {
        const problems = passwordProblems('Ab1!');
        expect(problems.some(p => p.includes(`at least ${MIN_LENGTH}`))).toBe(true);
    });

    test('flags each missing character class', () => {
        const problems = passwordProblems('alllowercase1!').join(' ');
        expect(problems).toContain('uppercase letter');

        expect(passwordProblems('ALLUPPERCASE1!').join(' ')).toContain('lowercase letter');
        expect(passwordProblems('NoNumbers!!').join(' ')).toContain('number');
        expect(passwordProblems('NoSpecial123').join(' ')).toContain('special character');
    });

    test('rejects passwords longer than the maximum', () => {
        const problems = passwordProblems('Aa1!' + 'x'.repeat(200));
        expect(problems.some(p => p.includes('cannot exceed'))).toBe(true);
    });
});
